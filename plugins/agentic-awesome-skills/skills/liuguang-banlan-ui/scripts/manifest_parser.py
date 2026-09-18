#!/usr/bin/env python3
"""Parse the data-only subset used by Liuguang theme manifests."""

from __future__ import annotations

import json
import pathlib
import re
from dataclasses import dataclass


MAX_MANIFEST_BYTES = 256 * 1024
MAX_NESTING_DEPTH = 64


class ManifestSyntaxError(ValueError):
    """Raised when a manifest contains code or unsupported JavaScript syntax."""


@dataclass(frozen=True)
class Token:
    kind: str
    value: str
    offset: int


TOKEN_RE = re.compile(
    r"""
    (?P<whitespace>\s+)
  | (?P<line_comment>//[^\r\n]*)
  | (?P<block_comment>/\*.*?\*/)
  | (?P<string>"(?:\\["\\/bfnrt]|\\u[0-9A-Fa-f]{4}|[^"\\\x00-\x1f])*")
  | (?P<number>-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)
  | (?P<identifier>[A-Za-z_$][A-Za-z0-9_$]*)
  | (?P<punctuation>[{}\[\]:,;=.])
    """,
    re.VERBOSE | re.DOTALL,
)


def tokenize(source: str) -> list[Token]:
    tokens: list[Token] = []
    offset = 0
    while offset < len(source):
        match = TOKEN_RE.match(source, offset)
        if match is None:
            raise ManifestSyntaxError(f"unsupported syntax at byte offset {offset}")
        kind = match.lastgroup
        if kind not in {"whitespace", "line_comment", "block_comment"}:
            tokens.append(Token(kind or "unknown", match.group(0), offset))
        offset = match.end()
    tokens.append(Token("eof", "", len(source)))
    return tokens


class Parser:
    def __init__(self, source: str) -> None:
        self.tokens = tokenize(source)
        self.index = 0

    @property
    def current(self) -> Token:
        return self.tokens[self.index]

    def take(self, value: str | None = None, kind: str | None = None) -> Token:
        token = self.current
        if value is not None and token.value != value:
            raise ManifestSyntaxError(
                f"expected {value!r} at byte offset {token.offset}, found {token.value!r}"
            )
        if kind is not None and token.kind != kind:
            raise ManifestSyntaxError(
                f"expected {kind} at byte offset {token.offset}, found {token.value!r}"
            )
        self.index += 1
        return token

    def accept(self, value: str) -> bool:
        if self.current.value != value:
            return False
        self.index += 1
        return True

    def parse(self) -> dict:
        self.take("window")
        self.take(".")
        self.take("SPECTRAL_THEME")
        self.take("=")
        value = self.parse_value(0)
        self.accept(";")
        self.take(kind="eof")
        if not isinstance(value, dict):
            raise ManifestSyntaxError("SPECTRAL_THEME must be an object")
        return value

    def parse_value(self, depth: int):
        if depth > MAX_NESTING_DEPTH:
            raise ManifestSyntaxError("manifest nesting limit exceeded")
        token = self.current
        if token.value == "{":
            return self.parse_object(depth + 1)
        if token.value == "[":
            return self.parse_array(depth + 1)
        if token.kind == "string":
            self.index += 1
            return json.loads(token.value)
        if token.kind == "number":
            self.index += 1
            try:
                return (
                    float(token.value)
                    if any(mark in token.value for mark in ".eE")
                    else int(token.value)
                )
            except ValueError as error:
                raise ManifestSyntaxError("numeric literal exceeds the supported range") from error
        if token.kind == "identifier" and token.value in {"true", "false", "null"}:
            self.index += 1
            return {"true": True, "false": False, "null": None}[token.value]
        raise ManifestSyntaxError(
            f"only data literals are allowed at byte offset {token.offset}; found {token.value!r}"
        )

    def parse_object(self, depth: int) -> dict:
        result: dict = {}
        self.take("{")
        if self.accept("}"):
            return result
        while True:
            token = self.current
            if token.kind == "identifier":
                key = self.take(kind="identifier").value
            elif token.kind == "string":
                key = json.loads(self.take(kind="string").value)
            else:
                raise ManifestSyntaxError(
                    f"object keys must be identifiers or strings at byte offset {token.offset}"
                )
            if key in result:
                raise ManifestSyntaxError(f"duplicate object key: {key}")
            self.take(":")
            result[key] = self.parse_value(depth)
            if self.accept("}"):
                return result
            self.take(",")
            if self.accept("}"):
                return result

    def parse_array(self, depth: int) -> list:
        result: list = []
        self.take("[")
        if self.accept("]"):
            return result
        while True:
            result.append(self.parse_value(depth))
            if self.accept("]"):
                return result
            self.take(",")
            if self.accept("]"):
                return result


def parse_manifest(source: str) -> dict:
    return Parser(source).parse()


def load_manifest(path: pathlib.Path) -> dict:
    with path.open("rb") as manifest:
        raw = manifest.read(MAX_MANIFEST_BYTES + 1)
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ManifestSyntaxError(
            f"manifest exceeds the {MAX_MANIFEST_BYTES}-byte size limit"
        )
    try:
        source = raw.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ManifestSyntaxError("manifest must be valid UTF-8") from error
    return parse_manifest(source)
