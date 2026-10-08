/* 姓名解析与渐进阅读规则。正文由 doctor-pages.js 提供。
 * 只在提交姓名后呈现，不进入公开、邮件或普通旧资料的索引。 */
(() => {
  "use strict";
  const people = [
    { id: "p1", name: "许昭然" }, { id: "p2", name: "江辞" },
    { id: "p3", name: "阮信然" }, { id: "p4", name: "方行止" },
    { id: "p5", name: "祁向生" }, { id: "p6", name: "苏念慈" },
    { id: "p7", name: "沈知返" }, { id: "p8", name: "季念真" }
  ];
  const coreIds = people.slice(0, 6).map(person => person.id);
  const layerIds = ["core", "recorder", "original"];
  const hasCore = ids => coreIds.every(id => ids.includes(id));
  const hasAll = ids => people.every(person => ids.includes(person.id));
  const canAdvance = ids => hasAll(ids);
  const submissionFeedback = (ids, layer) => !hasCore(ids) ? "已记下。还有自述没有对应的姓名。" : !canAdvance(ids, layer) ? "名字已记下，这一页还没对全。" : hasAll(ids) ? "名字齐了，可以继续往下读。" : "已核对，可以往下读了。";
  const aliases = ["第七天再开窗", "别替人收尾", "门缝里有灰", "账还没完", "原片不外借", "归还处没人", "迟到的读者"];
  function inspectNames(raw) {
    const normalized = String(raw).normalize("NFKC").replace(/[、，,;；\n\r\s]+/g, "");
    if (!normalized) return { error: "empty", ids: [] };
    if (aliases.some(alias => normalized.includes(alias))) return { error: "alias", ids: [] };
    const found = normalized.match(new RegExp(people.map(person => person.name).join("|"), "g")) || [];
    if (!found.length || found.join("") !== normalized) return { error: "unknown", ids: [] };
    if (new Set(found).size !== found.length) return { error: "duplicate", ids: [] };
    return { error: null, ids: found.map(name => people.find(person => person.name === name).id) };
  }
  function parseNames(raw) {
    const result = inspectNames(raw);
    return result.error ? null : result.ids;
  }
  const normalizeSubmission = raw => String(raw).normalize("NFKC").trim().replace(/[、，,;；\n\r\s]+/g, "|");
  const modules = { core: {}, recorder: { person: "p7" }, original: { person: "p8" } };
  // 各层共享同一组原件和旁注；七/八姓名不会改变故事事实或跳过核心层。
  window.__continuity = { people, coreIds, layerIds, hasCore, hasAll, parseNames, inspectNames, normalizeSubmission, canAdvance, submissionFeedback, modules };
})();

