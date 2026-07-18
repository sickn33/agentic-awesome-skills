"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Ajv2020 = require("ajv/dist/2020");

const SCHEMA_ROOT = path.resolve(__dirname, "../../../schemas/aas-v1");
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, validateFormats: false });
const validators = new Map();

function validatorFor(name) {
  if (validators.has(name)) return validators.get(name);
  if (!/^[a-z0-9-]+\.schema\.json$/.test(name)) throw new Error("AAS_SCHEMA_NAME_INVALID");
  const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_ROOT, name), "utf8"));
  const validate = ajv.compile(schema);
  validators.set(name, validate);
  return validate;
}

function validateInstance(name, value, code = "AAS_SCHEMA_INSTANCE_INVALID", category = "integrity") {
  const validate = validatorFor(name);
  if (validate(value)) return value;
  const error = new Error(code);
  error.code = code;
  error.category = category;
  error.details = {
    issues: (validate.errors || []).slice(0, 32).map((issue) => ({
      instancePath: issue.instancePath,
      keyword: issue.keyword,
    })),
  };
  throw error;
}

module.exports = { SCHEMA_ROOT, validateInstance, validatorFor };
