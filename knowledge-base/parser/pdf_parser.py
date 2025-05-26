from model import DocumentSegment
from util.errors import NoSuchDocumentError
import pdfplumber
import os


def group_words_into_lines(page_words, y_tolerance=2):
    lines = []
    if not page_words:
        return lines

    current_line_words = []
    # Sort words primarily by their top coordinate, then by their left coordinate.
    # This helps in maintaining reading order.
    sorted_words = sorted(page_words, key=lambda w: (w["top"], w["x0"]))

    for word in sorted_words:
        if not current_line_words:
            current_line_words.append(word)
        else:
            # Check if the current word is on the same line as the previous ones.
            # A word is on the same line if its vertical center is close to the previous word's vertical center.
            prev_word = current_line_words[-1]
            vertical_center_prev = (prev_word["top"] + prev_word["bottom"]) / 2
            vertical_center_curr = (word["top"] + word["bottom"]) / 2

            # Check if y-coordinates are close enough and x0 is not much smaller (avoiding out-of-order)
            if (
                abs(vertical_center_curr - vertical_center_prev) < y_tolerance
                and word["x0"] >= prev_word["x0"] - y_tolerance
            ):  # word['top'] < prev_word['bottom'] and word['bottom'] > prev_word['top']
                current_line_words.append(word)
            else:
                # New line started
                if current_line_words:  # Finalize the current line
                    # Sort words in the line by x0 to ensure correct text order
                    current_line_words.sort(key=lambda w: w["x0"])
                    lines.append(current_line_words)
                current_line_words = [word]

    if current_line_words:  # Add the last line
        current_line_words.sort(key=lambda w: w["x0"])
        lines.append(current_line_words)
    return lines


def parse_pdf(path: str) -> tuple[str, list[DocumentSegment]]:
    """
    Parses a PDF document, extracts its raw text content, and attempts to
    segment it based on heuristic header detection (e.g., font size changes).

    Args:
        path: The file path to the PDF document.

    Returns:
        A tuple containing:
            - raw_content: The concatenated raw text from all pages.
            - segments: A list of DocumentSegment objects, where each segment
                        corresponds to a heuristically identified text block
                        (potentially a paragraph or a header with its content).

    Raises:
        NoSuchDocumentError: If the PDF file at the given path is not found.
    """
    if not os.path.exists(path):
        raise NoSuchDocumentError(f"PDF document {path} not found")

    all_pages_word_based_text: list[
        str
    ] = []  # Store text derived from words for each page
    segments: list[DocumentSegment] = []
    current_doc_char_offset = 0

    try:
        with pdfplumber.open(path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                page_words = page.extract_words(
                    x_tolerance=2,
                    y_tolerance=3,
                    keep_blank_chars=False,  # Set to False to avoid multiple spaces from blank chars
                    use_text_flow=True,
                    extra_attrs=["fontname", "size"],
                )

                page_lines_of_words = group_words_into_lines(
                    page_words, y_tolerance=max(1, page.height * 0.005)
                )  # Smaller y_tolerance

                # Construct page_text from words to ensure consistency for indexing
                current_page_text_from_words_parts = []
                for line_words in page_lines_of_words:
                    current_page_text_from_words_parts.append(
                        " ".join(w["text"] for w in line_words)
                    )
                # Join lines with a single newline for this page's word-based text
                page_text_from_words = "\n".join(current_page_text_from_words_parts)
                all_pages_word_based_text.append(
                    page_text_from_words
                )  # Store this for final raw_content

                if not page_lines_of_words:
                    # If page has no words, extract_text might still yield something (e.g. from images)
                    # For consistency, if we base on words, and no words, page is empty in terms of segments.
                    # The raw_content will still include page.extract_text() output if needed elsewhere,
                    # but segments come from words.
                    # For now, if no words, this page contributes its word-based text (empty) and no segments from here.
                    continue

                current_segment_text_parts: list[str] = []
                current_segment_words_on_page: list[
                    dict
                ] = []  # Store words for the current segment on this page
                page_segment_start_char_offset = 0  # Offset within page_text_from_words

                last_line_bottom = 0
                last_line_avg_size = 0

                for line_idx, line_words in enumerate(page_lines_of_words):
                    if not line_words:
                        continue

                    line_text = " ".join(w["text"] for w in line_words).strip()
                    if not line_text:
                        continue

                    current_line_top = min(w["top"] for w in line_words)
                    current_line_bottom = max(w["bottom"] for w in line_words)
                    current_line_sizes = [
                        w["size"] for w in line_words if w["size"] > 0
                    ]
                    current_line_avg_size = (
                        sum(current_line_sizes) / len(current_line_sizes)
                        if current_line_sizes
                        else 0
                    )

                    new_segment_condition = False
                    if current_segment_words_on_page:
                        vertical_gap = current_line_top - last_line_bottom
                        if vertical_gap > (last_line_avg_size * 1.5) or (
                            current_line_avg_size > last_line_avg_size * 1.2
                            and current_line_avg_size > 0
                            and last_line_avg_size > 0
                        ):  # Added last_line_avg_size > 0
                            new_segment_condition = True

                    if new_segment_condition and current_segment_words_on_page:
                        segment_text = "\n".join(
                            current_segment_text_parts
                        ).strip()  # Join lines of segment with newline
                        if segment_text:
                            avg_font_size = (
                                sum(
                                    w["size"]
                                    for w in current_segment_words_on_page
                                    if w["size"] > 0
                                )
                                / len(current_segment_words_on_page)
                                if current_segment_words_on_page
                                else 0
                            )
                            font_names = list(
                                set(
                                    w["fontname"]
                                    for w in current_segment_words_on_page
                                    if w["fontname"]
                                )
                            )
                            main_font_name = (
                                font_names[0]
                                if len(font_names) == 1
                                else (font_names[0] if font_names else "N/A")
                            )

                            # Start index is current_doc_char_offset + page_segment_start_char_offset
                            segments.append(
                                DocumentSegment(
                                    text=segment_text,
                                    start_index=current_doc_char_offset
                                    + page_segment_start_char_offset,
                                    end_index=current_doc_char_offset
                                    + page_segment_start_char_offset
                                    + len(segment_text),
                                    metadata={
                                        "source_page": page_num,
                                        "avg_font_size": round(avg_font_size, 2),
                                        "font_name": main_font_name,
                                    },
                                )
                            )
                        # Reset for new segment, update page_segment_start_char_offset
                        # It's the length of previous segment + 1 (for newline) if joining with newlines.
                        # Or more simply, current_segment_text_parts was joined by \n, page_text_from_words is also joined by \n.
                        # The start of the new segment is the end of the previous one within the page's text stream.
                        page_segment_start_char_offset += len(segment_text) + (
                            1 if segment_text and line_text else 0
                        )  # +1 for the newline that separated them
                        current_segment_text_parts = []
                        current_segment_words_on_page = []

                    current_segment_text_parts.append(line_text)
                    current_segment_words_on_page.extend(line_words)
                    last_line_bottom = current_line_bottom
                    last_line_avg_size = (
                        current_line_avg_size
                        if current_line_avg_size > 0
                        else last_line_avg_size
                    )

                # Add the last accumulated segment for the page
                if current_segment_text_parts:
                    segment_text = "\n".join(
                        current_segment_text_parts
                    ).strip()  # Join lines of segment with newline
                    if segment_text:
                        avg_font_size = (
                            sum(
                                w["size"]
                                for w in current_segment_words_on_page
                                if w["size"] > 0
                            )
                            / len(current_segment_words_on_page)
                            if current_segment_words_on_page
                            else 0
                        )
                        font_names = list(
                            set(
                                w["fontname"]
                                for w in current_segment_words_on_page
                                if w["fontname"]
                            )
                        )
                        main_font_name = (
                            font_names[0]
                            if len(font_names) == 1
                            else (font_names[0] if font_names else "N/A")
                        )
                        segments.append(
                            DocumentSegment(
                                text=segment_text,
                                start_index=current_doc_char_offset
                                + page_segment_start_char_offset,
                                end_index=current_doc_char_offset
                                + page_segment_start_char_offset
                                + len(segment_text),
                                metadata={
                                    "source_page": page_num,
                                    "avg_font_size": round(avg_font_size, 2),
                                    "font_name": main_font_name,
                                },
                            )
                        )
                current_doc_char_offset += len(page_text_from_words) + len(
                    "\n\n"
                )  # +2 for double newline between pages

    except FileNotFoundError:
        raise NoSuchDocumentError(f"PDF document {path} not found")
    except Exception as e:
        print(f"Error parsing PDF {path} with pdfplumber: {e}")
        # Join whatever page texts were collected for raw_content
        final_raw_content_on_error = "\n\n".join(all_pages_word_based_text).strip()
        return (
            final_raw_content_on_error,
            segments,
        )  # Return what we have so far, segments might be incomplete

    final_raw_content = "\n\n".join(all_pages_word_based_text).strip()
    return final_raw_content, segments
