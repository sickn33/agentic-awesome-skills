export const packJourneys = [
  { id: 'build', title: 'Build a product', description: 'Web apps, mobile experiences and APIs.', steps: ['Brief', 'Interface', 'Working app'], packs: ['web-app','aas-mobile-app-builder','aas-python-api-builder','aas-api-platform-builder','aas-secure-app-builder','essentials','indie-game-dev','systems-programming','makepad-builder','architecture-design'] },
  { id: 'design', title: 'Design & communicate', description: 'Interfaces, accessible experiences and presentations.', steps: ['Idea', 'Design', 'Review'], packs: ['design-studio','aas-accessibility-inclusive-ux','aas-documents-presentations'] },
  { id: 'data', title: 'Make sense of data', description: 'Reliable pipelines, analysis and useful answers.', steps: ['Sources', 'Analysis', 'Insights'], packs: ['aas-data-analytics','aas-data-engineering-platform'] },
  { id: 'agents', title: 'Connect & automate', description: 'Agents, MCP tools and repeatable workflows.', steps: ['Trigger', 'Tools', 'Result'], packs: ['aas-agent-mcp-builder','aas-automation-builder','aas-ai-product-evaluation-ops','skill-author'] },
  { id: 'quality', title: 'Test & protect', description: 'Testing, security, infrastructure and recovery.', steps: ['Inspect', 'Improve', 'Verify'], packs: ['aas-security-engineer','aas-qa-test-automation','aas-devops-cloud','aas-observability-ir','aas-privacy-compliance-engineering','oss-maintainer'] },
  { id: 'growth', title: 'Launch & grow', description: 'Positioning, acquisition and international reach.', steps: ['Audience', 'Launch', 'Learn'], packs: ['aas-marketing-seo-growth','aas-saas-launch-revenue','aas-localization-international-growth','commerce-payments','odoo-erp'] },
];
export const packTitles: Record<string, string> = {
'web-app':'Build a web app','aas-mobile-app-builder':'Build a mobile app','aas-python-api-builder':'Build a Python service','aas-api-platform-builder':'Design an API platform','aas-secure-app-builder':'Build in app security',
'design-studio':'Design a product experience','aas-accessibility-inclusive-ux':'Make an interface accessible','aas-documents-presentations':'Create documents & presentations',
'aas-data-analytics':'Analyze data & explain results','aas-data-engineering-platform':'Build reliable data pipelines',
'aas-agent-mcp-builder':'Build an agent or MCP tool','aas-automation-builder':'Automate a workflow','aas-ai-product-evaluation-ops':'Evaluate an AI feature',
'aas-security-engineer':'Review security','aas-qa-test-automation':'Test an application','aas-devops-cloud':'Prepare cloud & delivery','aas-observability-ir':'Investigate an incident','aas-privacy-compliance-engineering':'Review privacy controls',
'aas-marketing-seo-growth':'Plan marketing & acquisition','aas-saas-launch-revenue':'Prepare a SaaS launch','aas-localization-international-growth':'Reach new languages & markets',
};
