"use strict";

class HostConfigError extends Error {
  constructor(code, category = "invalidInput", details = {}) {
    super(code);
    this.name = "HostConfigError";
    this.code = code;
    this.category = category;
    this.details = details;
  }
}

function hostConfigError(code, category, details) {
  return new HostConfigError(code, category, details);
}

module.exports = { HostConfigError, hostConfigError };
