"use strict";

function transactionError(code, category, details = {}, cause) {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  error.category = category;
  error.details = details;
  return error;
}

module.exports = { transactionError };
