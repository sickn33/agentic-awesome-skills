const search = require("../../tools/lib/aas-v1/search");

module.exports = {
  ...require("../../tools/lib/aas-v1/versions"),
  ...search,
  searchSkills(catalog, input) {
    return search.searchSkills(catalog.discoveryCatalog || catalog, input);
  },
  ...require("../../tools/lib/aas-v1/selection"),
  ...require("../../tools/lib/aas-v1/canonical-json"),
  ...require("../../tools/lib/aas-v1/evidence"),
};
