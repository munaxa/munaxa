export type StandardId="governance"|"content"|"visualization"|"search"|"multi-tenant"|"audit"|"documentation";
export interface EnterpriseStandard {
  id:StandardId;
  title:string;
  arabicTitle:string;
  summary:string;
  document:string;
  owner:string;
  lifecycle:"stable";
  lastReviewed:string;
  keywords:string[];
  related:string[];
}
export const enterpriseStandards:EnterpriseStandard[]=[
  {id:"governance",title:"Design Governance",arabicTitle:"حوكمة نظام التصميم",summary:"Ownership, contribution, review, lifecycle, versioning, release, migration, and deprecation.",document:"DESIGN_GOVERNANCE.md",owner:"Design System Council",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["ownership","proposal","release","semver","migration","deprecation","review"],related:["components","roadmap"]},
  {id:"content",title:"Content Design",arabicTitle:"نظام تصميم المحتوى",summary:"Voice, tone, terminology, microcopy, bilingual messaging, and channel standards.",document:"CONTENT_DESIGN_SYSTEM.md",owner:"Content Design",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["voice","tone","arabic","microcopy","errors","notifications","sms","email"],related:["accessibility","notifications"]},
  {id:"visualization",title:"Data Visualization",arabicTitle:"نظام تصور البيانات",summary:"Decision-led charts, metrics, dashboards, accessibility, and domain analytics.",document:"DATA_VISUALIZATION_SYSTEM.md",owner:"Analytics Experience",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["charts","kpi","dashboard","attendance","finance","enrollment","heatmap"],related:["reports","templates"]},
  {id:"search",title:"Search Architecture",arabicTitle:"بنية البحث",summary:"Authorized global/domain search, suggestions, recents, saved searches, filters, and keyboard flows.",document:"SEARCH_UX_ARCHITECTURE.md",owner:"Product Architecture",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["global search","student","teacher","invoice","filters","keyboard","mobile"],related:["workspaces","permissions"]},
  {id:"multi-tenant",title:"Multi-Tenant UX",arabicTitle:"تجربة تعدد المؤسسات",summary:"Tenant, school, campus, year, term, branch, and role context safety.",document:"MULTI_TENANT_UX_ARCHITECTURE.md",owner:"Platform Experience",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["tenant","school","campus","year","term","role","switcher","isolation"],related:["permissions","workspaces"]},
  {id:"audit",title:"Audit & Compliance",arabicTitle:"التدقيق والامتثال",summary:"Audit logs, changes, approvals, sensitive actions, reasons, and compliance evidence.",document:"AUDIT_COMPLIANCE_UX.md",owner:"Security & Compliance UX",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["audit","approval","change history","reason","finance","attendance","compliance"],related:["audit trail","permissions","workflows"]},
  {id:"documentation",title:"Documentation Architecture",arabicTitle:"بنية التوثيق",summary:"Information architecture, page hierarchy, cross-linking, search metadata, and publishing workflow.",document:"ENTERPRISE_DOCUMENTATION_ARCHITECTURE.md",owner:"Documentation Architecture",lifecycle:"stable",lastReviewed:"2026-06-18",keywords:["documentation","navigation","information architecture","search","cross-link","page hierarchy"],related:["governance","all standards"]},
];

