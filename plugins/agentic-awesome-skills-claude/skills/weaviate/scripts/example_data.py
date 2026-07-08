#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "weaviate-agents==1.2.0",
#   "typer==0.21.0",
#   "datasets>=4.5.0",
# ]
# ///
"""
Download an example dataset from the Hugging Face dataset hub.

Usage:
    uv run example_data.py --domain "domain_name" --nrows "number_of_rows" --vectorizer "vectorizer_name"

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
    + Any provider API keys (OPENAI_API_KEY, COHERE_API_KEY, etc.) - auto-detected
"""

import sys
import typer
import weaviate
from weaviate.client import WeaviateClient
import re
from weaviate.classes.config import Property, DataType, Configure
from datasets import load_dataset
from datetime import datetime, timezone

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()

# Vectorizer string to config mapping
VECTORIZER_MAP = {
    "text2vec_weaviate": lambda: Configure.Vectors.text2vec_weaviate(),
    "text2vec_openai": lambda: Configure.Vectors.text2vec_openai(),
    "text2vec_cohere": lambda: Configure.Vectors.text2vec_cohere(),
    "text2vec_huggingface": lambda: Configure.Vectors.text2vec_huggingface(),
    "text2vec_google_gemini": lambda: Configure.Vectors.text2vec_google_gemini(),
    "text2vec_jinaai": lambda: Configure.Vectors.text2vec_jinaai(),
    "text2vec_voyageai": lambda: Configure.Vectors.text2vec_voyageai(),
    "text2vec_model2vec": lambda: Configure.Vectors.text2vec_model2vec(),
    "text2vec_transformers": lambda: Configure.Vectors.text2vec_transformers(),
    "text2vec_ollama": lambda: Configure.Vectors.text2vec_ollama(),
    "multi2vec_clip": lambda: Configure.Vectors.multi2vec_clip(),
    "multi2vec_bind": lambda: Configure.Vectors.multi2vec_bind(),
    "none": lambda: Configure.Vectors.self_provided(),
}


def _get_sentences(document: str) -> tuple[list[str], list[tuple[int, int]]]:
    """
    Split document into sentences based on sentence_boundaries.
    Maintains original order and preserves boundaries in chunks.
    Returns sentences and their character spans (start, end) in the original document.
    """
    sentence_boundaries: list[str] = [".", "?", "!"]
    if not sentence_boundaries or not document:
        return ([document], [(0, len(document))]) if document else ([], [])

    escaped_boundaries = [re.escape(boundary) for boundary in sentence_boundaries]
    pattern = r"(?<=" + "|".join(escaped_boundaries) + r")\s+"

    sentences = []
    spans = []
    current_pos = 0

    for match in re.finditer(pattern, document):
        sentence_end = match.start()
        sentence = document[current_pos:sentence_end].strip()

        if sentence:
            sentences.append(sentence)
            spans.append((current_pos, sentence_end))

        current_pos = match.end()

    remaining = document[current_pos:].strip()
    if remaining:
        sentences.append(remaining)
        spans.append((current_pos, len(document)))

    filtered_sentences = []
    filtered_spans = []
    for sentence, span in zip(sentences, spans):
        if sentence:
            filtered_sentences.append(sentence)
            filtered_spans.append(span)

    return (
        (filtered_sentences, filtered_spans)
        if filtered_sentences
        else ([document], [(0, len(document))])
    )


def chunk_by_sentences(
    document: str,
    num_sentences: int,
    overlap_sentences: int = 1,
) -> tuple[list[str], list[tuple[int, int]]]:
    """
    Given a document (string), return the sentences as chunks and span annotations (start and end indices of chunks).
    """

    if overlap_sentences >= num_sentences:
        print(
            f"Warning: overlap_sentences ({overlap_sentences}) is greater than num_sentences ({num_sentences}). Setting overlap to {num_sentences - 1}"
        )
        overlap_sentences = num_sentences - 1

    sentences = _get_sentences(document)

    span_annotations = []
    chunks = []

    i = 0
    while i < len(sentences[0]):
        # Get chunk of num_sentences sentences
        chunk_sentences = sentences[1][i : i + num_sentences]
        if not chunk_sentences:
            break

        # Get start and end char positions
        start_char = chunk_sentences[0][0]
        end_char = chunk_sentences[-1][1]

        # Add chunk and its span annotation
        chunks.append(document[start_char:end_char])
        span_annotations.append((start_char, end_char))

        # Move forward but account for overlap
        i += num_sentences - overlap_sentences

    return chunks, span_annotations


def create_ai_arxiv_collection(
    client: WeaviateClient, vectorizer: str = "text2vec_weaviate", nrows: int = 1000
):
    # check existence of collection
    if client.collections.exists("AI_Arxiv"):
        print(
            f"Collection 'AI_Arxiv' already exists. Cannot create. Returning.",
            file=sys.stderr,
        )
        return

    print(f"Creating collection 'AI_Arxiv'...", file=sys.stderr)
    collection = client.collections.create(
        "AI_Arxiv",
        description="AI and machine learning research papers from arXiv, chunked by sentences for semantic search.",
        properties=[
            Property(
                name="paper_id",
                data_type=DataType.TEXT,
                index_searchable=False,
                description="Unique arXiv paper identifier (e.g., '2301.07041')",
            ),
            Property(
                name="title",
                data_type=DataType.TEXT,
                description="Title of the research paper",
            ),
            Property(
                name="summary",
                data_type=DataType.TEXT,
                description="Abstract or summary of the research paper",
            ),
            Property(
                name="source",
                data_type=DataType.TEXT,
                index_searchable=False,
                description="URL or source link to the original arXiv paper",
            ),
            Property(
                name="authors",
                data_type=DataType.TEXT,
                description="Comma-separated list of paper authors",
            ),
            Property(
                name="categories",
                data_type=DataType.TEXT,
                description="arXiv subject categories (e.g., 'cs.LG', 'stat.ML')",
            ),
            Property(
                name="comment",
                data_type=DataType.TEXT,
                description="Additional comments or notes from the authors",
            ),
            Property(
                name="primary_category",
                data_type=DataType.TEXT,
                description="Primary arXiv subject category for the paper",
            ),
            Property(
                name="published",
                data_type=DataType.DATE,
                index_range_filters=True,
                description="Date the paper was first published on arXiv",
            ),
            Property(
                name="updated",
                data_type=DataType.DATE,
                index_range_filters=True,
                description="Date the paper was last updated on arXiv",
            ),
            Property(
                name="chunk",
                data_type=DataType.TEXT,
                description="Text chunk from the paper body used for semantic search",
            ),
            Property(
                name="chunk_start",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Character offset where this chunk starts in the original document",
            ),
            Property(
                name="chunk_end",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Character offset where this chunk ends in the original document",
            ),
        ],
        vector_config=VECTORIZER_MAP[vectorizer](),
        inverted_index_config=Configure.inverted_index(index_null_state=True),
    )

    dataset = load_dataset("jamescalam/ai-arxiv2", split="train", keep_in_memory=True)
    nrows = nrows or len(dataset)

    with collection.batch.fixed_size(batch_size=100) as batch:
        for i in range(min(nrows, len(dataset))):
            item = dataset[i]

            if i % int(min(nrows, len(dataset)) / 10) == 0:
                print(
                    f"Importing {i}/{min(nrows, len(dataset))} objects... (AI_Arxiv)",
                    file=sys.stderr,
                )

            if item and isinstance(item, dict):
                chunks, span_annotations = chunk_by_sentences(
                    document=item["content"], num_sentences=15, overlap_sentences=0
                )
                del item["content"]

                item["paper_id"] = item["id"]
                del item["id"]
                del item["references"]
                item["published"] = (
                    datetime.strptime("20231126", "%Y%m%d").replace(tzinfo=timezone.utc)
                    if item["published"]
                    else None
                )
                item["updated"] = (
                    datetime.strptime("20231126", "%Y%m%d").replace(tzinfo=timezone.utc)
                    if item["updated"]
                    else None
                )
                for chunk, span in zip(chunks, span_annotations):
                    item["chunk"] = chunk
                    item["chunk_start"] = span[0]
                    item["chunk_end"] = span[1]
                    batch.add_object(properties=item)

            if batch.number_errors > 10:
                print(
                    "Batch import stopped due to excessive errors. Returning.",
                    file=sys.stderr,
                )
                break

    failed_objects = collection.batch.failed_objects
    if failed_objects:
        print(
            f"Number of failed imports: {len(failed_objects)}",
            file=sys.stderr,
        )
        print(f"First failed object: {failed_objects[0]}", file=sys.stderr)
        return

    print(
        f"Created collection 'AI_Arxiv' with {len(collection)} objects.",
        file=sys.stderr,
    )


def create_income_tax_returns_collection(
    client: WeaviateClient, vectorizer: str = "text2vec_weaviate", nrows: int = 1000
):
    # check existence of collection
    if client.collections.exists("Income_Tax_Returns"):
        print(
            f"Collection 'Income_Tax_Returns' already exists. Cannot create. Returning.",
            file=sys.stderr,
        )
        return

    print(f"Creating collection 'Income_Tax_Returns'...", file=sys.stderr)
    collection = client.collections.create(
        "Income_Tax_Returns",
        description="Indian income tax return filings with taxpayer details, financials, and filing metadata.",
        properties=[
            Property(
                name="pan",
                data_type=DataType.TEXT,
                index_searchable=False,
                description="Permanent Account Number (PAN) — unique tax identifier for the taxpayer",
            ),
            Property(
                name="acknowledgement_number",
                data_type=DataType.TEXT,
                index_searchable=False,
                description="Government-issued acknowledgement number for the filed return",
            ),
            Property(
                name="name",
                data_type=DataType.TEXT,
                description="Full legal name of the taxpayer",
            ),
            Property(
                name="address",
                data_type=DataType.TEXT,
                index_searchable=False,
                description="Street address of the taxpayer",
            ),
            Property(
                name="area",
                data_type=DataType.TEXT,
                description="Area or locality name within the city",
            ),
            Property(
                name="city", data_type=DataType.TEXT, description="City of residence"
            ),
            Property(
                name="state",
                data_type=DataType.TEXT,
                description="State or province of residence",
            ),
            Property(
                name="pincode",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Postal PIN code for the taxpayer's address",
            ),
            Property(
                name="state_code",
                data_type=DataType.TEXT,
                description="Two-character state code",
            ),
            Property(
                name="country_code",
                data_type=DataType.TEXT,
                description="ISO two-character country code (e.g., 'IN' for India)",
            ),
            Property(
                name="entity",
                data_type=DataType.TEXT,
                description="Type of taxpayer entity (e.g., 'Individual', 'Company', 'HUF')",
            ),
            Property(
                name="form",
                data_type=DataType.TEXT,
                description="Tax form type used for filing (e.g., 'ITR-1', 'ITR-2')",
            ),
            Property(
                name="assessment_year_start",
                data_type=DataType.DATE,
                index_range_filters=True,
                description="Start date of the tax assessment year",
            ),
            Property(
                name="assessment_year_end",
                data_type=DataType.DATE,
                index_range_filters=True,
                description="End date of the tax assessment year",
            ),
            Property(
                name="filing_datetime",
                data_type=DataType.DATE,
                index_range_filters=True,
                description="Date and time when the return was filed",
            ),
            Property(
                name="late_filing",
                data_type=DataType.BOOL,
                description="Whether the return was filed after the due date",
            ),
            Property(
                name="signatory",
                data_type=DataType.TEXT,
                description="Name of the authorized signatory on the return",
            ),
            Property(
                name="loss",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Total loss amount in Indian Rupees (INR)",
            ),
            Property(
                name="income",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Total taxable income in Indian Rupees (INR)",
            ),
            Property(
                name="tax",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Total tax payable in Indian Rupees (INR)",
            ),
            Property(
                name="cess",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Health and education cess amount in Indian Rupees (INR)",
            ),
            Property(
                name="interest",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Interest payable or receivable in Indian Rupees (INR)",
            ),
            Property(
                name="total_payable",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Total amount payable including tax, cess, and interest in Indian Rupees (INR)",
            ),
        ],
        vector_config=VECTORIZER_MAP[vectorizer](),
        inverted_index_config=Configure.inverted_index(index_null_state=True),
    )

    dataset = load_dataset(
        "AgamiAI/Indian-Income-Tax-Returns", split="train", keep_in_memory=True
    )
    nrows = nrows or len(dataset)

    with collection.batch.fixed_size(batch_size=100) as batch:
        for i in range(min(nrows, len(dataset))):
            item = dataset[i]

            if i % int(min(nrows, len(dataset)) / 10) == 0:
                print(
                    f"Importing {i}/{min(nrows, len(dataset))} objects... (Income_Tax_Returns)",
                    file=sys.stderr,
                )

            if item and isinstance(item, dict):
                batch.add_object(
                    properties={
                        "pan": item["pan"],
                        "acknowledgement_number": item["acknowledgement_number"],
                        "name": item["name"],
                        "address": item["address"],
                        "area": item["area"],
                        "city": item["city"],
                        "state": item["state"],
                        "pincode": item["pincode"],
                        "state_code": item["state_code"],
                        "country_code": item["country_code"],
                        "entity": item["entity"],
                        "form": item["form"],
                        "assessment_year_start": datetime.strptime(
                            item["assessment_year"][:4], "%Y"
                        ).replace(tzinfo=timezone.utc),
                        "assessment_year_end": datetime.strptime(
                            item["assessment_year"][5:], "%y"
                        ).replace(tzinfo=timezone.utc),
                        "filing_datetime": datetime.strptime(
                            item["filing_time"], "%d-%b-%Y %H:%M:%S"
                        ).replace(tzinfo=timezone.utc),
                        "late_filing": item["late_filing"],
                        "signatory": item["signatory"],
                        "loss": (
                            item["financials"]["loss"]
                            if "loss" in item["financials"]
                            else None
                        ),
                        "income": (
                            item["financials"]["income"]
                            if "income" in item["financials"]
                            else None
                        ),
                        "tax": (
                            item["financials"]["tax"]
                            if "tax" in item["financials"]
                            else None
                        ),
                        "cess": (
                            item["financials"]["cess"]
                            if "cess" in item["financials"]
                            else None
                        ),
                        "interest": (
                            item["financials"]["interest"]
                            if "interest" in item["financials"]
                            else None
                        ),
                        "total_payable": (
                            item["financials"]["total_payable"]
                            if "total_payable" in item["financials"]
                            else None
                        ),
                    }
                )

            if batch.number_errors > 10:
                print(
                    "Batch import stopped due to excessive errors. Returning.",
                    file=sys.stderr,
                )
                break

    failed_objects = collection.batch.failed_objects
    if failed_objects:
        print(
            f"Number of failed imports: {len(failed_objects)}",
            file=sys.stderr,
        )
        print(f"First failed object: {failed_objects[0]}", file=sys.stderr)
        return

    print(
        f"Created collection 'Income_Tax_Returns' with {len(collection)} objects.",
        file=sys.stderr,
    )


def create_product_catalog_collection(
    client: WeaviateClient, vectorizer: str = "text2vec_weaviate", nrows: int = 1000
):
    # check existence of collection
    if client.collections.exists("Product_Catalog"):
        print(
            f"Collection 'Product_Catalog' already exists. Cannot create. Returning.",
            file=sys.stderr,
        )
        return

    print(f"Creating collection 'Product_Catalog'...", file=sys.stderr)
    collection = client.collections.create(
        "Product_Catalog",
        description="E-commerce product catalog with pricing, brand, weight, and three-level category hierarchy.",
        properties=[
            Property(
                name="product_name",
                data_type=DataType.TEXT,
                description="Name or title of the product",
            ),
            Property(
                name="size",
                data_type=DataType.TEXT,
                description="Size specification of the product (e.g., 'Small', '250g', '1L')",
            ),
            Property(
                name="pack_type",
                data_type=DataType.TEXT,
                description="Type of packaging (e.g., 'Box', 'Bag', 'Bottle')",
            ),
            Property(
                name="organic_status",
                data_type=DataType.TEXT,
                description="Organic certification status of the product (e.g., 'Organic', 'Conventional')",
            ),
            Property(
                name="weight_kg",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Product weight in kilograms",
            ),
            Property(
                name="brand",
                data_type=DataType.TEXT,
                description="Brand name of the product",
            ),
            Property(
                name="price_usd",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Product price in US dollars (USD)",
            ),
            Property(
                name="category",
                data_type=DataType.TEXT,
                description="Top-level product category (L1)",
            ),
            Property(
                name="subcategory",
                data_type=DataType.TEXT,
                description="Second-level product subcategory (L2)",
            ),
            Property(
                name="subsubcategory",
                data_type=DataType.TEXT,
                description="Third-level product subcategory (L3)",
            ),
        ],
        vector_config=VECTORIZER_MAP[vectorizer](),
        inverted_index_config=Configure.inverted_index(index_null_state=True),
    )

    dataset = load_dataset(
        "pkghf/ecom-product-catalog", split="train", keep_in_memory=True
    )
    nrows = nrows or len(dataset)

    with collection.batch.fixed_size(batch_size=100) as batch:
        for i in range(min(nrows, len(dataset))):
            item = dataset[i]

            if i % int(min(nrows, len(dataset)) / 10) == 0:
                print(
                    f"Importing {i}/{min(nrows, len(dataset))} objects... (Product_Catalog)",
                    file=sys.stderr,
                )

            if item and isinstance(item, dict):
                batch.add_object(
                    properties={
                        "product_name": item["product_name"],
                        "size": item["size"],
                        "pack_type": item["pack_type"],
                        "organic_status": item["organic_status"],
                        "weight_kg": item["weight_kg"],
                        "brand": item["brand"],
                        "price_usd": item["price_usd"],
                        "category": item["L1"],
                        "subcategory": item["L2"],
                        "subsubcategory": item["L3"],
                    }
                )

            if batch.number_errors > 10:
                print(
                    "Batch import stopped due to excessive errors. Returning.",
                    file=sys.stderr,
                )
                break

    failed_objects = collection.batch.failed_objects
    if failed_objects:
        print(
            f"Number of failed imports: {len(failed_objects)}",
            file=sys.stderr,
        )
        print(f"First failed object: {failed_objects[0]}", file=sys.stderr)
        return

    print(
        f"Created collection 'Product_Catalog' with {len(collection)} objects.",
        file=sys.stderr,
    )


def duration_to_days(duration_str: str) -> float | None:
    """Convert a duration string like '4 weeks', '2-4 weeks', '14 days' to a number of days.

    For ranges like '2-4 weeks', returns the average (3 weeks = 21 days).
    """
    unit_to_days = {
        "day": 1,
        "days": 1,
        "week": 7,
        "weeks": 7,
        "month": 30,
        "months": 30,
        "year": 365,
        "years": 365,
    }

    match = re.match(
        r"(\d+)(?:\s*-\s*(\d+))?\s+(days?|weeks?|months?|years?)",
        duration_str.strip(),
        re.IGNORECASE,
    )
    if not match:
        return None

    low = float(match.group(1))
    high = float(match.group(2)) if match.group(2) else low
    unit = match.group(3).lower()

    avg = (low + high) / 2
    return avg * unit_to_days[unit]


def create_hair_medical_collection(
    client: WeaviateClient, vectorizer: str = "text2vec_weaviate", nrows: int = 1000
):
    # check existence of collection
    if client.collections.exists("Hair_Medical"):
        print(
            f"Collection 'Hair_Medical' already exists. Cannot create. Returning.",
            file=sys.stderr,
        )
        return

    print(f"Creating collection 'Hair_Medical'...", file=sys.stderr)
    collection = client.collections.create(
        "Hair_Medical",
        description="Hair disease diagnoses with associated symptoms, medications, side effects, severity, and treatment duration.",
        properties=[
            Property(
                name="side_effects",
                data_type=DataType.TEXT,
                description="Known side effects of the prescribed medication",
            ),
            Property(
                name="avg_duration_days",
                data_type=DataType.NUMBER,
                index_range_filters=True,
                description="Average treatment duration in days",
            ),
            Property(
                name="symptoms",
                data_type=DataType.TEXT,
                description="Symptoms associated with the hair disease",
            ),
            Property(
                name="medication_description",
                data_type=DataType.TEXT,
                description="Description and mechanism of action of the medication",
            ),
            Property(
                name="hair_disease",
                data_type=DataType.TEXT,
                description="Name of the hair disease or condition being treated",
            ),
            Property(
                name="medication",
                data_type=DataType.TEXT,
                description="Name of the prescribed medication",
            ),
            Property(
                name="disease_description",
                data_type=DataType.TEXT,
                description="Detailed description of the hair disease or condition",
            ),
            Property(
                name="disease_severity",
                data_type=DataType.TEXT,
                description="Severity level of the disease (e.g., 'Mild', 'Moderate', 'Severe')",
            ),
        ],
        vector_config=VECTORIZER_MAP[vectorizer](),
        inverted_index_config=Configure.inverted_index(index_null_state=True),
    )

    dataset = load_dataset("Amod/hair_medical_sit", split="train", keep_in_memory=True)

    nrows = nrows or len(dataset)

    with collection.batch.fixed_size(batch_size=100) as batch:
        for i in range(min(nrows, len(dataset))):
            item = dataset[i]

            if i % int(min(nrows, len(dataset)) / 10) == 0:
                print(
                    f"Importing {i}/{min(nrows, len(dataset))} objects... (Hair_Medical)",
                    file=sys.stderr,
                )
            if item and isinstance(item, dict):
                batch.add_object(
                    properties={
                        "side_effects": item["Side Effects"],
                        "avg_duration_days": duration_to_days(item["Duration"]),
                        "symptoms": item["Symptoms"],
                        "medication_description": item["Medication Description"],
                        "hair_disease": item["Hair Disease"],
                        "medication": item["Medication"],
                        "disease_description": item["Disease Description"],
                        "disease_severity": item[" Severity of Disease"],
                    }
                )
            if batch.number_errors > 10:
                print(
                    "Batch import stopped due to excessive errors. Returning.",
                    file=sys.stderr,
                )
                break

    failed_objects = collection.batch.failed_objects

    if failed_objects:
        print(
            f"Number of failed imports: {len(failed_objects)}",
            file=sys.stderr,
        )
        print(f"First failed object: {failed_objects[0]}", file=sys.stderr)
        return

    print(
        f"Created collection 'Hair_Medical' with {len(collection)} objects.",
        file=sys.stderr,
    )


def create_helpdesk_tickets_collection(
    client: WeaviateClient, vectorizer: str = "text2vec_weaviate", nrows: int = 1000
):
    # check existence of collection
    if client.collections.exists("IT_Support_Tickets"):
        print(
            f"Collection 'IT_Support_Tickets' already exists. Cannot create. Returning.",
            file=sys.stderr,
        )
        return

    print(f"Creating collection 'IT_Support_Tickets'...", file=sys.stderr)
    collection = client.collections.create(
        "IT_Support_Tickets",
        description="Synthetic IT helpdesk support tickets with subject, description, priority, category, and requester details.",
        properties=[
            Property(
                name="ticket_id",
                data_type=DataType.TEXT,
                index_searchable=False,
                description="Unique identifier for the support ticket",
            ),
            Property(
                name="subject",
                data_type=DataType.TEXT,
                description="Short subject line summarizing the IT issue",
            ),
            Property(
                name="description",
                data_type=DataType.TEXT,
                description="Detailed description of the IT support issue reported by the requester",
            ),
            Property(
                name="priority",
                data_type=DataType.TEXT,
                description="Priority level of the ticket (e.g., 'Low', 'Medium', 'High', 'Critical')",
            ),
            Property(
                name="category",
                data_type=DataType.TEXT,
                description="Category of the IT issue (e.g., 'Hardware', 'Software', 'Network', 'Access')",
            ),
            Property(
                name="createdAt",
                data_type=DataType.DATE,
                index_range_filters=True,
                description="Date and time when the ticket was created",
            ),
            Property(
                name="requesterEmail",
                data_type=DataType.TEXT,
                description="Email address of the person who submitted the ticket",
            ),
        ],
        vector_config=VECTORIZER_MAP[vectorizer](),
        inverted_index_config=Configure.inverted_index(index_null_state=True),
    )

    dataset = load_dataset(
        "Console-AI/IT-helpdesk-synthetic-tickets", split="train", keep_in_memory=True
    )

    nrows = nrows or len(dataset)

    with collection.batch.fixed_size(batch_size=100) as batch:
        for i in range(min(nrows, len(dataset))):
            item = dataset[i]

            if i % int(min(nrows, len(dataset)) / 10) == 0:
                print(
                    f"Importing {i}/{min(nrows, len(dataset))} objects... (IT_Support_Tickets)",
                    file=sys.stderr,
                )

            if item and isinstance(item, dict):
                batch.add_object(
                    properties={
                        "ticket_id": item["id"],
                        "subject": item["subject"],
                        "description": item["description"],
                        "priority": item["priority"],
                        "category": item["category"],
                        "createdAt": datetime.strptime(
                            item["createdAt"], "%Y-%m-%dT%H:%M:%S.%fZ"
                        ).replace(tzinfo=timezone.utc),
                        "requesterEmail": item["requesterEmail"],
                    }
                )
            if batch.number_errors > 10:
                print(
                    "Batch import stopped due to excessive errors. Returning.",
                    file=sys.stderr,
                )
                break

    failed_objects = collection.batch.failed_objects

    if failed_objects:
        print(
            f"Number of failed imports: {len(failed_objects)}",
            file=sys.stderr,
        )
        print(f"First failed object: {failed_objects[0]}", file=sys.stderr)
        return

    print(
        f"Created collection 'IT_Support_Tickets' with {len(collection)} objects.",
        file=sys.stderr,
    )


@app.command()
def main(
    domain: str = typer.Option("academic", "--domain", "-d"),
    nrows: int = typer.Option(None, "--nrows", "-n"),
    vectorizer: str = typer.Option(
        "text2vec_weaviate",
        "--vectorizer",
        "-v",
        help=f"Vectorizer to use. Options: {', '.join(VECTORIZER_MAP.keys())}",
    ),
):
    """Download an example dataset from the Hugging Face dataset hub."""
    with get_client() as client:
        if domain == "academic":
            create_ai_arxiv_collection(client, vectorizer, nrows)
        elif domain == "finance":
            create_income_tax_returns_collection(client, vectorizer, nrows)
        elif domain == "ecommerce":
            create_product_catalog_collection(client, vectorizer, nrows)
        elif domain == "medical":
            create_hair_medical_collection(client, vectorizer, nrows)
        elif domain == "customer_support":
            create_helpdesk_tickets_collection(client, vectorizer, nrows)
        else:
            print(f"Domain '{domain}' not supported. Returning.", file=sys.stderr)
            raise typer.Exit(1)


if __name__ == "__main__":
    app()
