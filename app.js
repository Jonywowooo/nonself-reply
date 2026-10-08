(() => {
  "use strict";

  const app = document.querySelector("#app");
  const startupSound = new Audio('./assets/audio/xp-startup.wav');
  startupSound.preload = 'auto';
  startupSound.volume = 0.55;
  // 保持试玩保存键；版本升级在 loadState 中迁移，刷新不清除玩家进度。
  const storageKey = "shenzhifan-laptop-v4";
  const flow = window.__storyFlow;
  const defaults = {
    storyVersion: 1,
    backupUnlocked: false,
    backupAttachmentOpened: false,
    backupError: "",
    investigationVersion: 3,
    legacyFinalAccess: false,
    started: false,
    currentApp: "desktop",
    minimizedApps: [],
    openApps: [],
    appScrolls: {},
    formDrafts: {},
    browserNotice: "",
    startMenuOpen: false,
    resetPrompt: false,
    desktopNotice: "",
    systemWindow: null,
    systemDialog: null,
    mail: { loggedIn: false, view: "inbox", thread: null, query: "", searches: [], searchHistoryOpen: false, searchHistoryVersion: 1, cachedThreads: [], readThreads: [], readMessages: {}, selectedMessages: {}, attachment: null },
    browser: { page: null, query: "", backStack: [], forwardStack: [], visits: [], visitedPages: [], searches: [], historyOpen: false },
    document: null,
    documentUnlocked: false,
    documentPasswordError: "",
    migration: false,
    archiveReviewUnlocked: false,
    archiveVersion: 1,
    recoveredAccounts: [],
    recoveryAccount: null,
    deliveryOpened: false,
    knownNames: {},
    legacy: { view: "archive", account: null },
    coreRecords: {},
    fileAnnotations: {},
    archiveSort: "recent",
    schoolClip: "night",
    schoolView: "position",
    evidenceView: {},
    evidenceZoom: {},
    evidencePositions: {},
    archive: { query: "", year: "", scope: "all", searched: false, selected: null, opened: [], searches: [], comparisons: [], directoryOpened: false },
    case: { clues: {}, reconstructed: false, verification: null, methodText: "", methodAttempts: 0, methodFeedback: "", methodSolved: false },
    notes: { personal: "", records: [] },
    finalUnlocked: false,
    nameReview: { submitted: [], completed: [], current: "core", draft: null, wrongSubmissions: [], hintLevel: -1, checkedAnswer: null, viewingRecords: false },
    archiveCreated: false
  };

  const loadState = () => {
    const clean = JSON.parse(JSON.stringify(defaults));
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const wasOldFinalReady = !saved.investigationVersion && saved.case?.reconstructed && ["xuzhaoran", "jiangci", "ruanxinran", "fangxingzhi", "qixiangsheng", "sunianci"].every(id => saved.coreRecords?.[id]);
      const hadPacket = saved.investigationVersion === 1 && saved.archive?.opened?.includes("enrollment");
      const next = { ...clean, ...saved, investigationVersion: 3, legacyFinalAccess: Boolean(saved.legacyFinalAccess || wasOldFinalReady || hadPacket) };
      next.mail = { ...clean.mail, ...(saved.mail || {}) };
      // 材料导出页面已撤下。旧存档回到收件箱，保留调查及结尾进度。
      if (next.mail.view === "archive") next.mail.view = "inbox";
      delete next.exportRequested;
      delete next.exportConfirmed;
      // 旧版本接通电源会自动把玩家送进门闩旧闻。只迁移这一个可识别的
      // 自动状态，保留已经真正开始调查的浏览记录和当前位置。
      const wasAutoOpenedCase = saved.started && saved.currentApp === "browser"
        && saved.browser?.page === "siren-clipping"
        && Array.isArray(saved.browser?.visits) && saved.browser.visits.length === 1
        && saved.browser.visits[0]?.page === "siren-clipping";
      if (wasAutoOpenedCase) {
        next.currentApp = "desktop";
        next.openApps = [];
        next.minimizedApps = [];
        next.browser = JSON.parse(JSON.stringify(clean.browser));
        if (next.case?.clues) delete next.case.clues.hook;
      }
      // 旧版本把所有尝试过的词都写进历史，无法证明它们曾命中；升级时清掉这份不可靠记录。
      if (saved.mail?.searchHistoryVersion !== 1) {
        next.mail.searches = [];
        next.mail.searchHistoryVersion = 1;
      }
      // 旧版本可以从账户页提前挂载旧目录。新口径只承认已经看见投递失败的调查者。
      // 保留邮件、笔记和已解锁往来，但不让旧视图继续绕过主线。
      // 旧版未单独记录诊断状态：已抵达终局，或已恢复且缓存了末封往来，按兼容口径保留入口。
      // 其他旧进度只收回入口，不删笔记、查阅原件与比较记录。
      if (saved.investigationVersion !== 3 && (next.finalUnlocked || next.legacyFinalAccess || (saved.migration && saved.mail?.cachedThreads?.includes("sunianci")))) next.deliveryOpened = true;
      if (!saved.archiveVersion && !next.deliveryOpened && !next.finalUnlocked && !next.legacyFinalAccess) {
        next.migration = false;
        if (["legacy-archive", "legacy-account", "migration", "local-data"].includes(next.mail.view)) next.mail.view = "inbox";
      }
      // 旧版确实整盘挂载过的进度保留；新存档只认可逐个恢复的缓存。
      const accounts = ["xuzhaoran", "jiangci", "ruanxinran", "fangxingzhi", "qixiangsheng", "sunianci"];
      next.recoveredAccounts = saved.archiveVersion === 1
        ? accounts.filter(id => Array.isArray(saved.recoveredAccounts) && saved.recoveredAccounts.includes(id))
        : next.migration ? accounts : [];
      next.archiveVersion = 1;
      next.migration = next.recoveredAccounts.length > 0;
      next.recoveryAccount = accounts.includes(saved.recoveryAccount) ? saved.recoveryAccount : null;
      next.archiveReviewUnlocked = Boolean(saved.archiveReviewUnlocked || next.finalUnlocked || next.legacyFinalAccess);
      // Preserve the original save separately. Old completed/private progress keeps access;
      // story routes are normalized without fabricating new page visits.
      if (!saved.storyVersion && Object.keys(saved).length) {
        try { if (!localStorage.getItem(storageKey + "-before-story")) localStorage.setItem(storageKey + "-before-story", JSON.stringify(saved)); } catch {}
        next.backupUnlocked = Boolean(saved.finalUnlocked || saved.legacyFinalAccess || saved.archiveReviewUnlocked || saved.case?.methodSolved);
        next.currentApp = "desktop"; next.document = "folder"; next.mail.view = "inbox";
      }
      next.storyVersion = 1;
      return next;
    }
    catch { return clean; }
  };
  const state = loadState();
  state.minimizedApps = Array.isArray(state.minimizedApps) ? state.minimizedApps : [];
  state.openApps = Array.isArray(state.openApps) ? state.openApps : [];
  state.appScrolls = state.appScrolls && typeof state.appScrolls === "object" ? state.appScrolls : {};
  state.startMenuOpen = Boolean(state.startMenuOpen);
  state.resetPrompt = Boolean(state.resetPrompt);
  state.systemWindow = ["computer", "network", "recycle"].includes(state.systemWindow) ? state.systemWindow : null;
  state.systemDialog = state.systemDialog && typeof state.systemDialog === "object" ? state.systemDialog : null;
  if (state.currentApp === "system" && !state.systemWindow) state.currentApp = "desktop";
  state.desktopNotice = "";
  state.documentUnlocked = Boolean(state.documentUnlocked);
  state.documentPasswordError = typeof state.documentPasswordError === "string" ? state.documentPasswordError : "";
  state.mail = { ...defaults.mail, ...(state.mail || {}) };
  state.mail.searches = Array.isArray(state.mail.searches) ? state.mail.searches : [];
  state.mail.searchHistoryVersion = 1;
  state.mail.cachedThreads = Array.isArray(state.mail.cachedThreads) ? state.mail.cachedThreads : [];
  const previouslyOpenedThreads = Array.isArray(state.mail.cachedThreads) ? state.mail.cachedThreads : [];
  const currentOpenedThread = state.mail.view === "thread" && typeof state.mail.thread === "string" ? [state.mail.thread] : [];
  state.mail.readThreads = [...new Set([
    ...(Array.isArray(state.mail.readThreads) ? state.mail.readThreads : []),
    ...previouslyOpenedThreads,
    ...currentOpenedThread,
    ...(previouslyOpenedThreads.length ? ["xuzhaoran"] : [])
  ].filter(id => typeof id === "string"))];
  state.archiveReviewUnlocked = Boolean(state.archiveReviewUnlocked || state.finalUnlocked || state.legacyFinalAccess);
  // 旧版若停在 recovery 附件页，刷新后回到当前人物往来，改用新的单组直达入口。
  if (state.mail.view === "attachment" && ["local-cache", "old-note", "device-photo"].includes(state.mail.attachment?.id) && state.mail.thread) {
    state.mail.view = "thread";
    state.mail.attachment = null;
  }
  state.knownNames = state.knownNames && typeof state.knownNames === "object" ? state.knownNames : {};
  state.browser = { ...JSON.parse(JSON.stringify(defaults.browser)), ...(state.browser || {}) };
  state.browser.backStack = Array.isArray(state.browser.backStack) ? state.browser.backStack : [];
  state.browser.forwardStack = Array.isArray(state.browser.forwardStack) ? state.browser.forwardStack : [];
  state.browser.visits = Array.isArray(state.browser.visits) ? state.browser.visits : [];
  state.browser.visitedPages = [...new Set([...(Array.isArray(state.browser.visitedPages)?state.browser.visitedPages:[]),...state.browser.visits.map(v=>v.page).filter(Boolean)])];
  state.mail.readMessages = state.mail.readMessages && typeof state.mail.readMessages === 'object' ? state.mail.readMessages : {};
  state.mail.selectedMessages = state.mail.selectedMessages && typeof state.mail.selectedMessages === 'object' ? state.mail.selectedMessages : {};
  const markMessageRead = (id,index) => {
    if(!threads[id]?.messages[index])return;
    const read=Array.isArray(state.mail.readMessages[id])?state.mail.readMessages[id]:[];
    if(!read.includes(index))read.push(index);
    state.mail.readMessages[id]=read;state.mail.selectedMessages[id]=index;
  };
  state.browser.searches = Array.isArray(state.browser.searches) ? state.browser.searches : [];
  state.evidenceView = state.evidenceView && typeof state.evidenceView === "object" ? state.evidenceView : {};
  state.evidenceZoom = state.evidenceZoom && typeof state.evidenceZoom === "object" ? state.evidenceZoom : {};
  state.evidencePositions = state.evidencePositions && typeof state.evidencePositions === "object" ? state.evidencePositions : {};
  state.legacy = { ...defaults.legacy, ...(state.legacy || {}) };
  state.coreRecords = state.coreRecords && typeof state.coreRecords === "object" ? state.coreRecords : {};
  state.archive = { ...JSON.parse(JSON.stringify(defaults.archive)), ...(state.archive || {}) };
  state.archive.opened = Array.isArray(state.archive.opened) ? state.archive.opened : [];
  state.archive.searches = Array.isArray(state.archive.searches) ? state.archive.searches : [];
  state.archive.comparisons = Array.isArray(state.archive.comparisons) ? state.archive.comparisons.filter(pair => Array.isArray(pair) && pair.length === 2 && pair.every(id => typeof id === "string") && pair[0] !== pair[1]).slice(-20) : [];
  state.fileAnnotations = state.fileAnnotations && typeof state.fileAnnotations === "object" ? state.fileAnnotations : {};
  const investigation = window.__investigation;
  state.case = { ...JSON.parse(JSON.stringify(defaults.case)), ...(state.case || {}) };
  state.case.clues = state.case.clues && typeof state.case.clues === "object" ? state.case.clues : {};
  state.case.notes = state.case.notes && typeof state.case.notes === "object" ? state.case.notes : {};
  state.case.methodText = typeof state.case.methodText === "string" ? state.case.methodText : "";
  state.case.methodAttempts = Number.isInteger(state.case.methodAttempts) && state.case.methodAttempts >= 0 ? state.case.methodAttempts : 0;
  state.case.methodFeedback = typeof state.case.methodFeedback === "string" ? state.case.methodFeedback : "";
  state.case.methodSolved = Boolean(state.case.methodSolved);
  state.notes = { ...JSON.parse(JSON.stringify(defaults.notes)), ...(state.notes || {}) };
  state.notes.records = Array.isArray(state.notes.records) ? state.notes.records : [];
  // Opening the ZIP is distinct from merely finding its sender or selecting its mail.
  // Migrate only concrete old attachment access; a cached contact alone is not discovery.
  state.backupAttachmentOpened = Boolean(state.backupAttachmentOpened || state.backupUnlocked
    || (state.mail.attachment?.thread === 'sunianci' && state.mail.attachment?.id === 'private-backup')
    || state.notes.records.some(item => item?.source === '邮件附件' && item?.label === '旧稿与邮件.zip'));
  state.nameReview = { ...JSON.parse(JSON.stringify(defaults.nameReview)), ...(state.nameReview || {}) };
  const continuity = window.__continuity;
  state.nameReview.submitted = [...new Set((Array.isArray(state.nameReview.submitted) ? state.nameReview.submitted : []).filter(id => continuity.people.some(person => person.id === id)))];
  state.nameReview.completed = [...new Set((Array.isArray(state.nameReview.completed) ? state.nameReview.completed : []).filter(id => ["core", "recorder", "original"].includes(id)))];
  state.nameReview.current = ["core", "recorder", "original"].includes(state.nameReview.current) ? state.nameReview.current : "core";
  state.nameReview.wrongSubmissions = [...new Set((Array.isArray(state.nameReview.wrongSubmissions) ? state.nameReview.wrongSubmissions : []).filter(value => typeof value === "string" && value))];
  state.nameReview.hintLevel = Number.isInteger(state.nameReview.hintLevel) ? Math.max(-1, Math.min(3, state.nameReview.hintLevel)) : -1;
  state.nameReview.viewingRecords = Boolean(state.nameReview.viewingRecords);
  const workspace = window.__xpWorkspace;
  workspace.normalize(state);
  let saveWarning = "";
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); saveWarning = ""; return true; }
    catch { saveWarning = "当前进度没能保存。先别刷新或关闭；允许浏览器保存本站数据后，再点“重试保存”。"; return false; }
  };
  const escapeHtml = (value = "") => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;" })[char]);
  const paragraphs = text => escapeHtml(text).split("\n\n").map(item => `<p>${item.replace(/\n/g, "<br>")}</p>`).join("");
  const setView = (currentApp, extra = {}) => { state.currentApp = currentApp; Object.assign(state, extra); save(); render(); };

  // 用户确认采用主持手册的年份顺序；月日来自两份案件本。
  // 事件时间与文章刊载、文件写入时间分别维护，不互相冒充。
  const caseChronology = Object.freeze({
    bnb: Object.freeze({ occurredOn: "2004.12.28", noteOn: "2004.12.29", period: "2004年12月", label: "2004年12月28日" }),
    school: Object.freeze({ noticeOn: "2005.04.05", discoveredOn: "2005.04.06", period: "2005年4月", noteOn: "2005.04.07" })
  });
  const caseNotebook = [
    { date: caseChronology.bnb.noteOn, body: "昨晚听见一声巨响，我跟着人群跑出去。陶艺展厅的门打不开，后来有人把门撞开，里面已经死了一个人。\n\n他们以为我只是吓住了。其实我连自己为什么会在这个村子都说不清。\n\n天快亮警察来问话，我听得懂每一句，却答不出自己怎么来的。先记住地点：湖畔村。" },
    { date: caseChronology.school.noteOn, body: "昨天在闪金村山上醒来，山下全是警笛。有人往废弃学校跑，说里面死人了。\n\n我旁边放着一套防护服和用过的喷雾器。我没敢碰，先离开。再醒来时已经是今天。\n\n上次是湖畔村，这次是这里。两次我都在附近，也都想不起之前做过什么。\n\n我不能一直等下一次醒来。" }
  ];
  caseNotebook.push(
    { date: "早期散页 · 未署日期（纸条与花）", relatedRecord: "flowers", body: "还是没有回话。我放在桌上的纸条不见了，房里也没留下别的字。\n\n这次我买了花，和“你是谁”一起放在那里。总不能连花也看不见。\n\n先别去问邻居。也许这次会有人回答。" },
    { date: "早期散页 · 未署日期（桌下）", relatedRecord: "recorder", body: "只留纸条没用。我买了一个小录音机，装在住处的桌子底下。下次至少能听见，这间屋里是谁说过话。\n\n我没和任何人商量。要是先说了，他就不会说真话。" },
    { date: "早期散页 · 未署日期（问邻居）", relatedRecord: "asking", body: "我戴着帽子和墨镜，去问附近的人：405那个住户平时和谁来往，做什么工作。\n\n我没说自己就是那个住户。我怕一说，他们就不肯讲。\n\n店主问我打听这些做什么。我说找人，然后先走了。不知道他信没信。" },
    { date: "2008.07.14 · 整理时补记", body: "湖畔的门被撞开以后，我看见了死者。闪金村我没进去，只在山上听见警笛。后来每次梦到它们，两处总挤在一起。\n\n我怕那两页是自己记错了，也怕没有记错。\n\n查“塞壬”时发现，有人连安南那起车祸也算了进去。我把当事人在论坛发的申述另存下来。她说花不是悼念，转帖却说有人用花宣告报复。连一句话都能各说各的，那些帖子里的湖畔又有多少是真的？" }
  );

  const caseNotebookEntryView = entry => {
    // 只连接已存在的另存笔记；它的署日不回填到这张未署日散页上。
    const related = investigation.records.find(record => record.id === entry.relatedRecord);
    const relatedReady = related && recordAvailable(related);
    const relatedLabel = relatedReady
      ? `<a href="#" data-action="open-archive-record" data-record="${escapeHtml(related.id)}">${escapeHtml(related.title)}</a>`
      : `<span class="archive-pending">${escapeHtml(related?.title || "相关原件")}（原件尚未恢复）</span>`;
    return `<section class="thread-item"><h2>${escapeHtml(entry.date)}</h2>${paragraphs(entry.body)}${related ? `<p class="related-page">另存笔记：${relatedLabel}<br><span class="faint">${escapeHtml(related.source)}</span></p>` : ""}</section>`;
  };

  // 玩家资料与改编来源台账对应；复印时间缺失时不补造。
  const caseMaterials = {
    "statement": "关于安南高速报道的申述\n\n车祸死者中有我以前的老板。我没有给他送过花。公司门口那束石楠花不是我订的，那束花不是悼念。别再用我的名字替它作说明。\n\n事故前，我的私人照片在公司里传过，也被塞进过宿舍。我不愿再讲照片是怎么拍的。报道没有写这些，我只是不愿意在他们死后，又被写成一个原谅了所有事的人。\n\n这份申述只更正与我有关的说法。我没有亲眼看见车祸，也不知道是谁放了花。\n\n许昭然",
    "receipt": "石榴巷405处警回执摘录\n\n现场未见撬锁痕迹。报案人称，房内花束为当日新放入，且并非本人所有；经问询后，报案人未提出进一步处理。\n\n处理建议：更换门锁，联系房屋管理人。\n\n转发时仅节录情况与处理建议，未附报案人资料；原件日期在这份副本中未保留。",
    "booking": "预订日期：2004.12.28\n预订人数：10\n备注：十名笔友以网名报名，首次线下见面；晚间借用陶艺展厅。\n\n本页只存预订摘要，完整网名栏及实际签到页缺失。",
    "injury": "湖畔村案的后续检验发现，死者胸部存在锐器伤。报道援引检验结论称，死亡发生在火起之前，烧伤并非本案的死亡原因。\n\n发现时右手在门闩旁，呈蜷曲姿态。报道没有认定这个姿态是死者生前主动抓握形成的，也未认定谁布置过现场。",
    "zhou": "经身份核验，2004年12月28日湖畔村民宿火灾的死者为周济川，曾在雁江会所保管档案。周并非此前失联的会所经营负责人，两人为不同人员。\n\n其随身工具箱内有部分损毁的存储介质，其余物品已移交核验。旧员工称，负责人失联后，周仍留有账目副本和私人联络记录；此说法尚待核实。\n\n聚会组织者表示，活动是笔友首次见面，并非雁江会所的聚会；报名时没有核实职业关系。\n\n案后网络曾出现署名“塞壬”的匿名留言。警方尚未公布该留言的来源。",
    "corridor": "文件名：湖畔走廊_转存.jpg\n随邮件保存的附件信息；图像尚未接入当前原型。\n\n画面说明：走廊尽头有火光，可见关闭的展厅门；角落叠印 23:25。\n原始拍摄时间字段：未保留。\n拍摄者署名：未保留。\n\n画面叠印不是经校准的案发时钟。这份转存资料无法单独确定起火时刻。"
  };
  const unsentCaseLetters = "母亲：\n\n周济川不是当年那个老板。老板不见了，管复印件的人还在，东西也还在。他在旧笔友往来里问我，想不想把雁江的那些东西拿回去。我答应到湖畔见他。聚会是别人组织的，我借着赴约去见他，不是那十个人一起约我算旧账。\n\n我以为带钱去就能结束。到了展厅，他又说复印件可以交，别处的底稿还得另算。他不是第一次这样开价；可我这次不肯再照办。\n\n周没有活着离开展厅。门锁住以后，我还以为终于有一件事按我想的结束了。\n\n火灭了，箱子没有烧完。我拿不到的东西仍然拿不到。以前我一直说，除掉盯着我的人就能重新生活。你死以后，我连这句话都不知道要说给谁听。\n\n——季念真\n页内日期：2004.12.29\n\n————\n\n母亲：\n\n湖畔之后，我开始不再问下一个人到底欠了我什么。谁都可以被我写进那种“他们”里面。这样我就不必再承认，有些人根本没有伤害过我。\n\n去闪金村的学生不认识我，也没拿过雁江的东西。我知道。他们不是周济川的同伙。\n\n我还是把预告寄给了警方。不是为了求救。我想让他们按我写下的地点、时间赶到，想证明所有人都只能来读我留下的东西。我把这样的念头叫报复。说穿了，我已经不肯停手。\n\n学校里两次看见的人影，不是死者自己换过房间。我利用了观察方向和映像；后来闯进房间的人遇到的也不是鬼。\n\n山上那套东西有人丢下就跑了。我回去取走了。可那个人把自己在山上醒来的事记了下来。这些纸比东西难收干净。\n\n你已经不会回这封信了。我却还在写，好像只要对你解释过，就有人答应我这样做。\n\n——季念真\n页内日期：2005.04.08";
  const unsentCaseLettersReadable = `母亲：

周济川不是当年那个老板。他管复印件和旧账。老板失踪后，他还留着雁江的那些东西。

他留着我以前寄稿的信封，又把上面的名字和雁江的材料对上了。那封信我只当是寄给笔友的，他却一直留着地址。我答应在湖畔见他。那十个人是去参加笔友聚会的；我是借着这次聚会，自己去见周济川，不是他们约我去算账。

我以为带钱去就能把事情了结。到了展厅，周又说复印件可以给我，别处的底稿要另外算钱。他以前也这样开过价。这次我没答应。

周是我杀的。我把小说里那场火搬进了展厅。门上闩的那一下不需要他活着。后来他们说，是尸体自己锁的门。

到这里就好。我那时真以为，事情可以按我写的结束。

火灭了，箱子没有烧完，材料也没拿回来。我以前总觉得，只要除掉盯着我的人，就能重新开始。你不在了，我连这句话说给谁听都不知道。

祖安剪报上那句“他们会找到母亲”，是我写的。读到生物痕迹，我先想到的就是你。我怕查到家里，可我没有收到过有人要去找你的消息。

后来我读到了苏念慈写的《山路》。她把那句话当成我的警告。我写的是怕会发生的事，她却已经照着最坏的结果做了。我不能把那行字从报纸上抹掉，就当自己没有写过。

——季念真
页内日期：2004.12.29

————

母亲：

湖畔以后，我买过几次报纸。翻来覆去都是那扇门，周的名字改过了，写到我这里仍是一句“凶手身份不明”。我嫌他们没看懂，甚至想再写一封信，把他们没问的话也写进去。

后来我想要的已经不是拿回材料了。我想让他们先收到我的话，再去看我留下的现场。湖畔没能按我写的结束，我就要再来一次。

闪金村的学生不认识我，也没拿过雁江的东西。我知道他们不是周济川的同伙。选他们的时候，我没有认错人。我不想再等一个伤害过我的人，给我动手的理由。

我还是给警方寄了预告，落款写“塞壬”。湖畔之后那条匿名留言，也是我用这个名字写的。后来报纸拿它去串别的旧案，有些是他们添进去的。我没有出来更正。

信封还没封的时候，我把信抽出来过。不寄，他们就不会因为我的话赶去那里。地址没改，信还是放回去了。

学校里两次出现的人影，不是死者换了房间。我利用观察位置和镜面做出了那个样子。后来闯进房间的人看到的也不是鬼。

防护服和喷雾器是我用过的。里面装的不是水，那些人死于我放出的有毒物质。报纸写七个人，包括一名警察。我把那一行看了几遍，没法再拿“吓一吓他们”解释。

山上有人丢下那套东西，我回去取走了。那个在山上醒来的人把这件事记了下来。那些纸我没能一起收走。

你不会回这封信了。我还是写，好像把话说完，就不用再面对我做过的事。

——季念真
页内日期：2005.04.08`;
  const mailAttachments = {
    xuzhaoran: { 0: [
      { id: "statement", name: "安南高速_申述.txt", source: "来源：安南旧事论坛｜保存：沈知返｜原署名：许昭然｜论坛署名：第七天再开窗｜原帖日期未完整保留", body: caseMaterials.statement, page: "annan-statement" }
    ] },
    ruanxinran: { 5: [
      { id: "old-note", name: "花束补记_旧附件", source: "来源：门缝里有灰的 2008.07.24 回信｜类型：旧记录｜状态：原件路径未挂载", body: "附件路径指向尚未挂载的旧版数据目录。当前邮件只保留附件名和旧路径，正文不受影响。", recovery: true, record: "flower-complaint" }
    ] },
    jiangci: { 2: [
      { id: "receipt", name: "石榴巷405_回执摘录.txt", source: "来源：沈知返转发｜类型：处警回执摘录", body: caseMaterials.receipt }
    ] },
    fangxingzhi: { 0: [
      { id: "booking", name: "湖畔订房确认_节录.txt", source: "来源：沈知返转发｜类型：活动附件", body: caseMaterials.booking, page: "bnb-roster" },
      { id: "zhou", name: "死者身份更正_剪报.txt", source: "来源：沈知返转存的公开更正｜刊载：2005.02", body: caseMaterials.zhou, page: "zhou" }
    ], 1: [
      { id: "device-photo", name: "桌下装置_旧附件", source: "来源：账还没完的回信｜类型：装置照片说明｜状态：原件路径未挂载", body: "附件路径指向尚未挂载的旧版数据目录。当前邮件只保留附件名和旧路径，正文不受影响。", recovery: true, record: "legacy:fangxingzhi:files:0" }
    ] },
    qixiangsheng: { 2: [
      { id: "corridor", name: "湖畔走廊_附件信息.txt", source: "转发人：沈知返；原拍摄者：附件未署名", body: caseMaterials.corridor }
    ] }
  };
  mailAttachments.ruanxinran[5] = [{ id: "old-note", name: "花束补记_附件说明.txt", source: "随原邮件保存的附件说明", body: "原信提到另写过一页花束补记；本封未附正文。" }];
  mailAttachments.fangxingzhi[1] = [{ id: "device-photo", name: "桌下装置_照片说明.txt", source: "账还没完随信附记", body: "装置在桌下发现。长线绕成两个圈，接头上有白胶布。照片不能说明是谁安装的。" }];
  mailAttachments.sunianci = { 6: [{ id: "private-backup", name: "旧稿与邮件.zip", source: "沈知返于2008.08.01随信发送的原附件", body: "" }] };
  const attachmentFor = (thread, id) => Object.values(mailAttachments[thread] || {}).flat().find(item => item.id === id);

  const xpIcon = kind => {
    const downloaded = { browser: "ie", mail: "mail" };
    if (downloaded[kind]) return `<i class="xp-icon xp-icon-${kind}" aria-hidden="true"><img src="./assets/xp-original/${downloaded[kind]}.png" alt=""></i>`;
    const original = { computer: 16, network: 18, recycle: 32, documents: 235 };
    if (original[kind]) return `<i class="xp-icon xp-icon-${kind}" aria-hidden="true"><img src="./assets/xp-original/shell-${original[kind]}.ico" alt=""></i>`;
    const icons = {
      documents: `<svg viewBox="0 0 48 48" focusable="false"><path d="M6 14h16l4 5h16v20H6z" fill="#e0a80a" stroke="#8c5b00"/><path d="M7 17h34v21H7z" fill="#ffd85d" stroke="#9f7414"/><path d="M16 8h16v22H16z" fill="#fffdf0" stroke="#727d85"/><path d="M20 15h9M20 19h9M20 23h9" stroke="#4d7ca1" stroke-width="1.5"/></svg>`,
      computer: `<svg viewBox="0 0 48 48" focusable="false"><rect x="8" y="7" width="29" height="24" rx="2" fill="#e9ece5" stroke="#5a6570"/><rect x="11" y="10" width="23" height="17" fill="#4b94c7"/><path d="M17 35h12l2 5H15z" fill="#d7d4c9" stroke="#5a6570"/><rect x="10" y="39" width="29" height="4" rx="1" fill="#b8b7ae" stroke="#667079"/><rect x="38" y="16" width="5" height="20" rx="1" fill="#d9d9d3" stroke="#65717a"/></svg>`,
      network: `<svg viewBox="0 0 48 48" focusable="false"><path d="M12 9h20v17H12z" fill="#dfe6e7" stroke="#566b76"/><path d="M15 12h14v11H15z" fill="#4293c9"/><path d="M19 29h7v6h-7z" fill="#b8b6aa" stroke="#58656d"/><path d="M7 36h29" stroke="#516673" stroke-width="2"/><path d="M35 17h7v17H27" fill="none" stroke="#536875" stroke-width="2"/><circle cx="41" cy="17" r="3" fill="#75a841"/></svg>`,
      recycle: `<svg viewBox="0 0 48 48" focusable="false"><path d="M15 12h18l-2 29H17z" fill="#8bc6e7" stroke="#3e708f"/><path d="M13 12h22M20 8h8" stroke="#3e708f" stroke-width="2"/><path d="M20 18l4 3 4-3M20 28l4-3 4 3" fill="none" stroke="#e8f9ff" stroke-width="2"/></svg>`,
      browser: `<svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="16" fill="#4e9fcb" stroke="#226384"/><path d="M8 24h32M24 8c6 7 6 25 0 32M24 8c-6 7-6 25 0 32" fill="none" stroke="#d9f2fc" stroke-width="1.5"/><path d="M13 28c5 5 18 5 25-3" fill="none" stroke="#e3b52a" stroke-width="3"/><path d="M32 21l6 2-4 5" fill="#e3b52a"/></svg>`,
      mail: `<svg viewBox="0 0 48 48" focusable="false"><rect x="6" y="10" width="35" height="28" rx="2" fill="#4d97c9" stroke="#245e8c"/><path d="M8 13l16 13 15-13" fill="#f8f8e9" stroke="#eef7ff" stroke-width="2"/><path d="M8 35l11-11m21 11L29 24" stroke="#d4ebf7" stroke-width="2"/><rect x="30" y="6" width="12" height="12" fill="#f6e98a" stroke="#9a7d18"/><path d="M33 10h6M33 13h6" stroke="#6a6020"/></svg>`,
      notes: `<svg viewBox="0 0 48 48" focusable="false"><rect x="10" y="5" width="28" height="37" fill="#fcfcf8" stroke="#66717a"/><path d="M15 15h18M15 20h18M15 25h18M15 30h13" stroke="#3779a4" stroke-width="1.4"/><path d="M10 10h28" stroke="#d0d7dc"/><path d="M14 5v6m6-6v6m6-6v6m6-6v6" stroke="#65717a" stroke-width="2"/></svg>`,
      showDesktop: `<svg viewBox="0 0 18 18" focusable="false"><rect x="2" y="3" width="14" height="10" fill="#5a9acc" stroke="#255f8c"/><path d="M1 15h16" stroke="#66727b" stroke-width="2"/></svg>`
    };
    return `<i class="xp-icon xp-icon-${kind}" aria-hidden="true">${icons[kind] || icons.notes}</i>`;
  };

  let openSystemMenu = null;
  let aboutWindow = false;
  const menuCommands = label => {
    const browser = state.currentApp === 'browser';
    const local = state.currentApp === 'documents' && ['reading','identity'].includes(state.document);
    const mail = state.currentApp === 'mail';
    if(label.startsWith('文件')) return [['新建(N)',null],['打开(O)',null],['打印(P)',null],['关闭(C)','close']];
    if(label.startsWith('编辑')) return [['撤销(U)',null],['剪切(T)',null],['复制(C)',null],['粘贴(P)',null],['查找(F)',mail?'mail-focus-search':browser?'focus-address':null]];
    if(label.startsWith('查看')) return [['后退(B)',browser?'browser-back':local?'local-folder':null],['刷新(R)',browser||local?'local-refresh':null],['历史记录(H)',browser?'browser-toggle-history':null],['还原窗口(R)','window-size']];
    if(label.startsWith('收藏')) return [['添加到收藏夹(A)',null],['整理收藏夹(O)',null]];
    if(label.startsWith('工具')) return mail?[['发送和接收(S)',null],['通讯簿(A)',null],['查找邮件(F)','mail-focus-search']]:[['Internet 选项(O)',null]];
    if(label.startsWith('邮件')) return [['新邮件(N)',null],['回复发件人(R)',null],['全部回复(A)',null],['转发(F)',null]];
    return [['关于(A)','ui-about']];
  };
  const menuBar = title => {
    const labels = ["我的文档", "我的电脑", "网上邻居", "回收站"].includes(title)
      ? ["文件(F)", "编辑(E)", "查看(V)", "收藏(A)", "工具(T)", "帮助(H)"]
      : title === "浏览器" || title.includes("Microsoft Internet Explorer")
      ? ["文件(F)", "编辑(E)", "查看(V)", "收藏(A)", "工具(T)", "帮助(H)"]
      : title === "Mail Assistant" || title === "Outlook Express"
        ? ["文件(F)", "编辑(E)", "查看(V)", "工具(T)", "邮件(M)", "帮助(H)"]
        : title === "记事本"
          ? ["文件", "编辑", "格式", "查看", "帮助"]
          : ["文件", "编辑", "查看", "帮助"];
    return `<div class="menu-bar" role="menubar" aria-label="${escapeHtml(title || "桌面")}菜单">${labels.map(label => `<div class="menu-anchor"><button role="menuitem" aria-haspopup="true" aria-expanded="${openSystemMenu===label}" data-action="system-menu" data-menu="${label}">${label}</button>${openSystemMenu===label?'<div class="menu-popup" role="menu">'+menuCommands(label).map(([text,action])=>'<button role="menuitem" '+(action?'data-action="'+action+'"':'disabled title="脱机留存中不可用"')+'>'+text+'</button>').join('')+'</div>':''}</div>`).join("")}</div>`;
  };

  const appMeta = {
    browser: { title: "浏览器", icon: "browser" },
    mail: { title: "Outlook Express", icon: "mail" },
    documents: { title: "我的文档", icon: "documents" },
    system: { title: "系统窗口", icon: "computer" }
  };

  const taskItem = (appId, active = false) => {
    const meta = appId === "system" ? {title:systemWindowTitle(),icon:state.systemWindow || "computer"} : appId === "documents" && ["reading", "identity"].includes(state.document) ? {title:"留存副本 - Internet Explorer",icon:"browser"} : appMeta[appId];
    if (!meta) return "";
    return `<button class="task-item ${active ? "active" : ""}" data-action="${active ? "minimize" : "restore-app"}" data-app="${appId}">${xpIcon(meta.icon)}<span>${meta.title}</span></button>`;
  };

  const systemWindowTitle = () => ({ computer: "我的电脑", network: "网上邻居", recycle: "回收站" }[state.systemWindow] || "系统窗口");
  const driveIcon = letter => `<i class="system-drive-icon" aria-hidden="true"><span></span><b>${letter}</b></i>`;
  const explorerToolbar = () => `<div class="system-explorer-toolbar" aria-hidden="true"><span class="explorer-tool"><i class="explorer-icon explorer-back"></i><small>后退</small></span><span class="explorer-tool explorer-tool-disabled"><i class="explorer-icon explorer-forward"></i><small>前进</small></span><span class="explorer-separator"></span><span class="explorer-tool"><i class="explorer-icon explorer-up"></i><small>向上</small></span><span class="explorer-separator"></span><span class="explorer-tool explorer-tool-wide"><i class="explorer-icon explorer-search"></i><small>搜索</small></span><span class="explorer-tool explorer-tool-wide"><i class="explorer-icon explorer-folders"></i><small>文件夹</small></span><span class="explorer-tool explorer-tool-wide"><i class="explorer-icon explorer-views"></i><small>视图</small></span></div>`;
  const explorerSidebar = kind => {
    const taskTitle = kind === "computer" ? "系统任务" : kind === "network" ? "网络任务" : "回收站任务";
    const tasks = kind === "computer"
      ? ["查看系统信息", "添加/删除程序", "搜索文件或文件夹"]
      : kind === "network"
        ? ["创建一个新的连接", "设置家庭或小型办公网络", "更改 Windows 防火墙设置"]
        : ["清空回收站", "还原所有项目", "搜索回收站"];
    return `<aside class="system-explorer-sidebar"><section><h3>${taskTitle}</h3>${tasks.map(item => `<button type="button" data-action="system-invalid">${escapeHtml(item)}</button>`).join("")}</section><section><h3>其它位置</h3><button type="button" data-action="system-invalid">我的电脑</button><button type="button" data-action="system-invalid">我的文档</button><button type="button" data-action="system-invalid">网上邻居</button></section><section><h3>详细信息</h3><strong>${systemWindowTitle()}</strong><span>系统文件夹</span></section></aside>`;
  };
  const systemExplorer = (kind, content) => `<section class="system-explorer"><div class="system-explorer-main">${explorerToolbar()}<div class="system-explorer-address"><span>地址</span><div class="system-explorer-address-field"><i class="documents-address-icon"></i><span>${kind === "computer" ? "我的电脑" : kind === "network" ? "网上邻居" : "回收站"}</span><b>▼</b></div><button type="button" data-action="system-invalid">转到</button></div><div class="system-explorer-layout">${explorerSidebar(kind)}<main class="system-explorer-content">${content}</main></div></div></section>`;
  const systemDialog = () => state.systemDialog ? `<div class="system-dialog-backdrop"><section class="system-dialog" role="dialog" aria-modal="true" aria-labelledby="system-dialog-title"><h2 id="system-dialog-title">${escapeHtml(state.systemDialog.title || "系统提示")}</h2><div class="system-dialog-message"><i aria-hidden="true">?</i><p>${escapeHtml(state.systemDialog.message || "当前项目无法打开。")}</p></div><div class="system-dialog-actions"><button class="system-button primary" data-action="close-system-dialog">确定</button></div></section></div>` : "";
  const systemWindowBody = () => {
    if (state.systemWindow === "computer") {
      const content = `<div class="system-explorer-group-title">硬盘</div><div class="system-drive-grid" aria-label="我的电脑磁盘"><button class="system-drive" data-action="open-drive" data-drive="C:">${driveIcon("C:")}<span>本地磁盘 (C:)</span></button><button class="system-drive" data-action="open-drive" data-drive="D:">${driveIcon("D:")}<span>本地磁盘 (D:)</span></button></div>`;
      return systemExplorer("computer", content) + systemDialog();
    }
    const empty = state.systemWindow === "network" ? "网上邻居中没有其他计算机。" : "回收站是空的。";
    return systemExplorer(state.systemWindow, `<div class="system-empty-view" data-action="system-invalid"><span>${empty}</span></div>`) + systemDialog();
  };

  const startMenu = () => `
    <aside class="start-menu" aria-label="开始菜单">
      <div class="start-menu-side"><span class="start-user-avatar" aria-hidden="true"></span>沈知返</div>
      <div class="start-menu-main">
        <button class="start-browser" data-action="open-app" data-app="browser">${xpIcon("browser")}<span>Internet<small>Internet Explorer</small></span></button>
        <button class="start-mail" data-action="open-app" data-app="mail">${xpIcon("mail")}<span>电子邮件<small>Outlook Express</small></span></button>
        <button class="start-documents" data-action="open-app" data-app="documents">${xpIcon("documents")}<span>我的文档</span></button>
        <button class="start-computer" data-action="desktop-item" data-item="computer">${xpIcon("computer")}<span>我的电脑</span></button>
        <button class="start-network" data-action="desktop-item" data-item="network">${xpIcon("network")}<span>网上邻居</span></button>
        <div class="start-menu-rule"></div>
        <button class="start-menu-desktop" data-action="show-desktop">${xpIcon("showDesktop")}<span>显示桌面</span></button>
        ${state.resetPrompt ? `<div class="start-menu-reset-confirm"><p>刷新不会清除本机进度。</p><p>确认从头开始？当前进度将被清除。</p><button class="system-button" data-action="reset-game">确认重新开始</button><button class="plain-link" data-action="cancel-reset">取消</button></div>` : `<button class="start-menu-reset" data-action="request-reset">重新开始游戏</button>`}
      </div>
    </aside>`;

  const launchApp = appId => {
    if (!appMeta[appId]) return;
    workspace.focus(state, appId);
    state.startMenuOpen = false;
    save();
    render();
  };

  const minimizeCurrentApp = () => {
    workspace.minimize(state);
    state.startMenuOpen = false;
    save();
    render();
  };

  const threads = {
  "xuzhaoran": {
    "name": "许昭然",
    "subject": "关于安南高速那篇旧报道",
    "preview": "不用安慰。我得睡一会儿。",
    "latest": "星期六 06:02",
    "messages": [
      [
        "沈知返",
        "第七天再开窗",
        "2008.07.15（星期二）22:14",
        "许昭然：\n\n我在安南旧事论坛看到你的申述，署名许昭然。附上我保存的那一份，里面写着：那束花不是悼念。\n\n有人把那起车祸也算进了“塞壬”。可旧报写的是车辆失控，你的申述又在反驳放花的事。我分不清，哪些是当年的事，哪些是后来传出来的。\n\n湖畔村那晚我也在。我记得展厅破门以后的样子，却想不起自己是怎么到那里的。我不敢凭几张转帖替自己下结论。\n\n申述没有写你是什么时候见到那束花的。你去的时候，有人知道是谁送来的吗？"
      ],
      [
        "第七天再开窗",
        "沈知返",
        "2008.07.17（星期四）03:41",
        "申述是我写的。\n\n安南高速死的是我以前的老板和他的未婚妻。新闻后来写得很干净，像雨大一点、车滑了一下，两个人就没了。\n\n花不是我放的。塞壬也不是我。\n\n后面的不用问。"
      ],
      [
        "沈知返",
        "第七天再开窗",
        "2008.07.17（星期四）11:08",
        "我看过那篇报道。它没有写事故以后还有人被留下来。\n\n我不是来问你是不是塞壬。那些转帖拿花当成有人报复的凭据，我想知道，你当时究竟看见了什么。"
      ],
      [
        "第七天再开窗",
        "沈知返",
        "2008.07.18（星期五）21:26",
        "我知道的不多。\n\n那时候我把窗帘拉了六天。第七天，报纸从门缝塞进来，我才知道他们死了。\n\n我后来去过一次公司。门口摆着石楠花，包得很夸张，像非要让路过的人都看见。保安说不是公司订的，也不是家属订的。\n\n有人以为花是我送的，还来问我是不是原谅了他们。我连花是谁放的都不知道。他们倒先替我原谅完了。"
      ],
      [
        "沈知返",
        "第七天再开窗",
        "2008.07.19（星期六）01:39",
        "谢谢你告诉我这些。\n\n那束花如果不是悼念，它也不该替任何人把事情说完。"
      ],
      [
        "第七天再开窗",
        "沈知返",
        "2008.07.19（星期六）06:02",
        "你这句话挺像安慰人的。\n\n不用安慰。我得睡一会儿。\n\n申述里已经写过的，别又改成悼念。别的我现在不想说。"
      ]
    ]
  },
  "jiangci": {
    "name": "江辞",
    "subject": "那篇没有写完的事故",
    "preview": "别把害怕写成她的毛病。",
    "latest": "星期一 12:52",
    "messages": [
      [
        "沈知返",
        "别替人收尾",
        "2008.07.19（星期六）11:03",
        "别替人收尾：\n\n我读到了署名“别替人收尾”的来信《被省略的人》。车祸的报道没有提私人照片，你的信提了。\n\n我正在核对那些被传成“塞壬”的旧事。照片的事，是你亲眼见过，还是听别人说的？我不想再拿转述当目击。"
      ],
      [
        "别替人收尾",
        "沈知返",
        "2008.07.19（星期六）17:19",
        "照片是她自己在申述里写的。不是我在现场看见的。\n\n我不认识许昭然。我骂的是那篇新闻，不是在给案子作证。两个人死了，怎么就能替活着的人宣布结束？\n\n石榴巷 405 我住过。我搬走以后才出了那件事。后来住进去的人说屋里多了东西，房东说她太累。那句话我也听过。换个住户，话都不用换。"
      ],
      [
        "沈知返",
        "别替人收尾",
        "2008.07.20（星期日）08:34",
        "我查到了你说的 405 租住帖。楼主上传过回执，摘录附在这封信里：屋里多了一束花，门没有被撬开。\n\n她没有说认识你。你提到房东说过同样的话，你也遇到过有人进屋？"
      ],
      [
        "别替人收尾",
        "沈知返",
        "2008.07.21（星期一）02:16",
        "和我没关系。\n\n你寄来的回执，我看了。后来住进去的人报了警：桌上有花，花很新，门没有被撬。上面没有写“她把自己吓坏了”。那是别人的话。\n\n我搬走了。她那天怎么回的家，我不知道。房东倒是很会省事，一句“太累了”，连换锁的钱都想省。\n\n别把害怕写成她的毛病。"
      ],
      [
        "沈知返",
        "别替人收尾",
        "2008.07.21（星期一）08:07",
        "你当时为什么搬？"
      ],
      [
        "别替人收尾",
        "沈知返",
        "2008.07.21（星期一）12:52",
        "因为我不想等到自己也开始怀疑，是不是我把门忘了锁。\n\n我说有人动过东西，他问我为什么这么晚才回家。问到最后，倒成了我该解释。\n\n所以我走了。不是搬走以后才不害怕，是害怕也得先走。"
      ]
    ]
  },
  "ruanxinran": {
    "name": "阮信然",
    "subject": "405 的那束花",
    "preview": "信上说能帮我，不是说要我还钱。",
    "latest": "星期四 05:37",
    "messages": [
      [
        "沈知返",
        "门缝里有灰",
        "2008.07.21（星期一）15:18",
        "门缝里有灰：\n\n我读到过“门缝里有灰”留下的那次报警回执。里面写，门没有被撬，屋里却多了一束花。\n\n我联系你不是替房东，也不是替警察问话。回执副本没有留下日期，你还记得大概是哪一年吗？那天以后有没有人再找过你？"
      ],
      [
        "门缝里有灰",
        "沈知返",
        "2008.07.21（星期一）23:11",
        "没有。\n\n或者有，我不确定。\n\n花早扔了。后来大家都说，可能是我自己买的，放着放着忘了。警察没找到人，房东也觉得我太累。既然所有人都这么说，大概就是我想多了。\n\n后来每次回家，我都先拽两下门，再进去。没丢东西，好像就不能说自己害怕了。\n\n你问那是哪一年，我怕又说错。二十三岁那年买了陶喆刚出的第一张同名唱片，花是过完年、第二年春天才出现的。不是买唱片那天。我记得花梗上蓝线绕了两圈，底下没有卡片。"
      ],
      [
        "沈知返",
        "门缝里有灰",
        "2008.07.22（星期二）10:46",
        "记不清是哪一年，不等于花没有出现。你记得的我先留下，不确定的地方暂时空着。"
      ],
      [
        "门缝里有灰",
        "沈知返",
        "2008.07.23（星期三）20:03",
        "你别这样说，好像我真的看见了什么。\n\n报警以后，过了一段时间，我收到一封信。说知道我的事，能帮我，让我去雁江会所后门等。\n\n我去了。我以为终于有人肯告诉我，花是谁放的。\n\n到了才知道，他们问的不是花。后面的事，我现在不想说。"
      ],
      [
        "沈知返",
        "门缝里有灰",
        "2008.07.24（星期四）00:18",
        "那封信还在吗？"
      ],
      [
        "门缝里有灰",
        "沈知返",
        "2008.07.24（星期四）05:37",
        "正文撕了。信封还在抽屉最下面，背面印着雁江会所的旧地址。\n\n我把唱片和花的事另写过一页，随信附上。那页是当时写的。我那时候还分得清，花是哪天来的，信是哪天来的。现在一提起后门，总觉得它们挤在同一天。\n\n我以为他们会问花。门打开以后，桌上摆的却是安南的旧报纸。我连那篇报道都不愿意看，他们却说这笔账该由我还。\n\n信上说能帮我，不是说要我还钱。"
      ]
    ]
  },
  "fangxingzhi": {
    "name": "方行止",
    "subject": "雁江会所的临时联系人",
    "preview": "我只管过账。",
    "latest": "星期六 03:34",
    "messages": [
      [
        "沈知返",
        "账还没完",
        "2008.07.24（星期四）10:12",
        "账还没完：\n\n雁江会所旧员工的结算页留下了“账还没完”这个联络署名。我查那页，是因为“门缝里有灰”收到过会所寄出的信。\n\n另外附上我保存的湖畔订房确认和死者身份更正。更正说周济川做过档案管理，也有人说他保留着旧员工的私人记录。你接触过他吗？我想分清这是传言，还是有人亲眼见过。"
      ],
      [
        "账还没完",
        "沈知返",
        "2008.07.24（星期四）16:26",
        "先说清，我只管过账。\n\n周管复印件和旧账，不是老板。有次他拿着一份旧材料进来，报了一个数。对方付完，他又报一个数。原件、复印件，分开算。我在旁边，听得清楚。\n\n会所关门以后，没再见过他。湖畔订房这笔我没经手；你寄来的底单写着预订十人，签到页缺着。我手里也没有。也别拿他的死来问我老板去了哪。\n\n我离开前，在住处桌子底下摸到过一个监听器。藏在我每天坐的地方。那人连我花多少钱都要问，我当时认定就是他装的。我把照片也附上。"
      ],
      [
        "沈知返",
        "账还没完",
        "2008.07.24（星期四）23:31",
        "你报过警吗？"
      ],
      [
        "账还没完",
        "沈知返",
        "2008.07.25（星期五）07:48",
        "报什么警。那种地方，报警只会让别人知道你还活着。\n\n我拿走了监听器，也拿走了钱。走之前按旧底单结过几笔工资，所以网上还有人追着那个署名问。老板后来没回来，我没回去等。\n\n工资归工资。剩下的，你别替我写成清算。\n\n新房第一晚，我二十八岁。电视正直播火箭挑走姚明，头一个。别人等着庆祝，我去试门锁。那只东西也在包里，接头缠着白胶布，长线绕成两个圈。我能搬走，手却一直在摸包还在不在。"
      ],
      [
        "沈知返",
        "账还没完",
        "2008.07.25（星期五）14:16",
        "我在旧剪报里看见，负责人失联后，有几个人去了祖安村。后来村外烧了一辆车。"
      ],
      [
        "账还没完",
        "沈知返",
        "2008.07.26（星期六）03:20",
        "那辆车我没经手。\n\n那张新闻配图我看过。车烧得连牌子都看不清，下面却写着四个人失踪。我走的时候，老板身边也还剩四个人。我不知道是不是同一批。\n\n我知道你为什么来问。老板不见了，那几个人也没回来，你觉得钱到了我手里，人就都该算在我账上。"
      ],
      [
        "账还没完",
        "沈知返",
        "2008.07.26（星期六）03:34",
        "账我只能说到这里。名字写出来，对活着的人没有好处。\n\n祖安村那辆车烧完以后，报纸登过一张现场照片。那时候警察还没到，拍照的人已经在那里了。\n\n我不知道她看见了多少。你若还想往下查，就去找那张照片。\n\n——账还没完",
        false,
        "报上那张照片"
      ]
    ]
  },
  "qixiangsheng": {
    "name": "祁向生",
    "subject": "祖安村那张照片",
    "preview": "后来那批底片进过一个很小的摄影展。",
    "latest": "星期二 03:33",
    "messages": [
      [
        "沈知返",
        "原片不外借",
        "2008.07.26（星期六）08:01",
        "原片不外借：\n\n祖安村焚车旧闻的照片说明署了“原片不外借”。我按照片说明里留下的投稿邮箱写来。\n\n报纸说四个人从那以后没再回来。配图只有烧毁的车，你拍到的是失火当晚，还是火灭以后的现场？"
      ],
      [
        "原片不外借",
        "沈知返",
        "2008.07.26（星期六）15:09",
        "报社用的是火灭以后的照片。配图不是失踪那一刻，别把它们当成同一件事。\n\n他们拿到一张裁过的图。原片没交。\n\n我记得自己站在哪儿。你要问车里的人去了哪儿，我没拍。"
      ],
      [
        "沈知返",
        "原片不外借",
        "2008.07.26（星期六）22:20",
        "原片里有什么？\n\n另附一张湖畔村走廊的转存图。有人把图上的 23:25 当作起火时间，我想请你看看这个时间能不能用。附件旁边没有署名。"
      ],
      [
        "原片不外借",
        "沈知返",
        "2008.07.27（星期日）08:47",
        "多一点车后面的路。报社裁了，留下车。\n\n原片交出去，人会问我为什么从那条路过来，而不是从村口。不是问画面里有谁，是问拿相机的人站在哪里。\n\n这件事我不想答。\n\n湖畔那张不是我拍的。右下角的 23:25 是压在画面上的字，不是原始拍摄时间字段。字段没了。要查钟准不准，得找原片或拿别的记录对。我手里没有。"
      ],
      [
        "沈知返",
        "原片不外借",
        "2008.07.27（星期日）17:06",
        "祖安村报道提到生物痕迹，但没有确认来源。照片可以认出地点，痕迹能不能认出人，是另一个问题。\n\n我不会把你没回答的话写成承认。原片后来一直在你手里吗？"
      ],
      [
        "原片不外借",
        "沈知返",
        "2008.07.29（星期二）03:33",
        "原片留着。借展的是另洗的照片，背面写过不许翻印。\n\n后来进过一个很小的摄影展。整理的人不追问哪块黑影是人，只问照片该怎么放。\n\n展叫《留下的人》。借展单还在，退回来的照片我没有再拆。底片和它们分开放。"
      ]
    ]
  },
  "sunianci": {
    "name": "苏念慈",
    "subject": "关于《留下的人》",
    "preview": "你知道我丢了什么？",
    "latest": "星期五 11:11",
    "messages": [
      [
        "沈知返",
        "归还处没人",
        "2008.07.29（星期二）08:02",
        "归还处没人：\n\n《留下的人》图录里有“归还处没人”的署名。署名“原片不外借”的摄影者说，你整理过借展的照片，原片仍由拍摄者保留。\n\n图录里也收了《山路》和一只工具箱。我在查祖安村照片的来处；湖畔死者带着的也是工具箱，但报道没附清楚的照片。\n\n这两件展品都是随那批照片送来的吗？箱里原来装的是什么？"
      ],
      [
        "归还处没人",
        "沈知返",
        "2008.07.29（星期二）14:17",
        "箱子不是一个。只看名字，是容易弄错。\n\n图录里的工具箱是装相机的，不是火场遗物。照片由“原片不外借”借展，原片没有交给我。相机上的灰是我擦掉的。\n\n你列的这些东西，我没放在同一只箱里。器材箱已经还了，相机还留着，镜头盖单独装在小袋里。\n\n借展单只登记摄影器材。湖畔那间展厅，我没去过。"
      ],
      [
        "沈知返",
        "归还处没人",
        "2008.07.29（星期二）20:41",
        "山路呢？"
      ],
      [
        "归还处没人",
        "沈知返",
        "2008.07.30（星期三）06:06",
        "山路是我母亲走过很多次的路。\n\n她后来不太记事。有时我刚进门，她已经在叫一个不属于我的名字。\n\n她总说，人活着最怕没有地方可回。我以前觉得她说得不对：有些人不是找不到地方，是一直被拖回同一个地方。"
      ],
      [
        "沈知返",
        "归还处没人",
        "2008.07.30（星期三）14:22",
        "是我只看见“工具箱”三个字，就把两件东西混在了一起。谢谢你说清楚。\n\n我在旧案摘记里看见，自己在湖畔村和闪金村附近都出现过。我不想拿别人的照片替自己补出当晚的事。\n\n你整理东西时，有没有见过署名“塞壬”的信？"
      ],
      [
        "归还处没人",
        "沈知返",
        "2008.08.01（星期五）04:55",
        "见过剪报。没见过那封寄给警方的信，不知道是谁寄的。\n\n母亲出事以后，我总想把用过的东西擦净、收回柜子里。收完一遍，还是知道少了什么。\n\n你说记不得那两晚，却还留着自己写的纸。我有时也这样。东西没有丢，人还是觉得少了一块。"
      ],
      [
        "沈知返",
        "归还处没人",
        "2008.08.01（星期五）11:11",
        "你知道我丢了什么？",
        true
      ]
    ]
  }
};
  const mailOrder = ["xuzhaoran", "jiangci", "ruanxinran", "fangxingzhi", "qixiangsheng", "sunianci"];
  const threadAliases = {
    xuzhaoran: ["第七天再开窗"],
    jiangci: ["别替人收尾"],
    ruanxinran: ["门缝里有灰"],
    fangxingzhi: ["账还没完"],
    qixiangsheng: ["原片不外借"],
    sunianci: ["归还处没人"]
  };
  // 主邮件先显示来往时使用的署名；真名只在原件或结局材料中自然出现。
  // 这不是把网名强行当成身份证明，而是避免界面替玩家提前完成身份对应。
  const threadDisplayName = id => threadAliases[id]?.[0] || threads[id]?.name || id;
  const displayParticipant = (id, name) => name === threads[id]?.name ? threadDisplayName(id) : name;
  const displayMailBody = (id, body) => body;
  const mailBodyHtml = body => paragraphs(body).replace(/https?:\/\/archive\.lin-chuan\.cn\/405\.html/g, url =>
    '<a href="'+url+'" data-action="open-page" data-page="405">'+url+'</a>');

  const accountLabel = id => state.knownNames[id] ? `${threadDisplayName(id)}（${threads[id].name}）` : threadDisplayName(id);
  const visibleThreadIds = () => mailOrder.filter(id => state.mail.cachedThreads.includes(id));
  const accountRecovered = id => state.recoveredAccounts.includes(id);
  const allAccountsRecovered = () => mailOrder.every(accountRecovered);
  // 原附件和篇名密码构成访问依据，不按打开联系人数量设隐性门槛。
  const backupAttachmentAvailable = () => state.backupUnlocked || (state.mail.loggedIn && state.mail.cachedThreads.includes("sunianci"));
  // 小说篇名解密备份后开放私人材料；日期密码与投递诊断不再控制访问。
  const archiveEntryAvailable = () => state.backupUnlocked;
  const archiveIndexAvailable = () => state.backupUnlocked;
  const archiveAvailable = () => state.backupUnlocked;
  // 文案以锁定稿独立加载；内嵌数据只保留为本地文件缺失时的降级副本。
  if (window.__lockedThreadCopy) Object.assign(threads, window.__lockedThreadCopy);
  threads.sunianci.messages[6][3] = "你说整理过旧文件。我在电脑上找到一个备份，打不开，也想不起什么时候存的。\n\n压缩包备注里有‘纸页文学／迟到的读者’，口令提示是未完稿的篇名。我没找到是哪一篇。\n\n等一下，报道说人在火起前就死了，门闩却留在锁扣里。锁门那一下到底发生在什么时候？我还没把这两件事对上。\n\n我把原文件附上。你认得它吗？";
  threads.sunianci.messages[6][4] = false;
  // 列表和诊断取正文的实际发送时间，避免修正文案后仍显示旧日期。
  const shortMessageDate = date => {
    const match = date.match(/^\d{4}\.(\d{2})\.(\d{2})（星期.）(\d{2}:\d{2})$/u);
    return match ? `${match[1]}/${match[2]} ${match[3]}` : date;
  };
  Object.values(threads).forEach(thread => {
    const lastMessage = thread.messages[thread.messages.length - 1];
    thread.latest = shortMessageDate(lastMessage[2]);
  });

  // 这不是任务面板：只保留玩家已经亲手打开或检索过的客观来源。
  const recordInvestigation = (source, label) => {
    const record = { source, label };
    const alreadyRecorded = state.notes.records.some(item => item.source === record.source && item.label === record.label);
    if (!alreadyRecorded) state.notes.records = [...state.notes.records, record].slice(-28);
  };
  const allCoreRecordsRead = () => mailOrder.every(id => Boolean(state.coreRecords[id]));
  const caseSources = [
    { page:"siren-clipping", clue:"hook", title:"现场剪报" },
    { page:"zhou", clue:"victim", title:"死者身份更正" },
    { page:"bnb-event", clue:"gathering", title:"聚会旧帖" },
    { page:"bnb-roster", clue:"registration", title:"订房确认" },
    { page:"bnb-power", clue:"power", title:"停电登记" },
    { page:"bnb-latch", clue:"latch", title:"旧门说明", field:"door", label:"门的动作", quote:"横闩插入锁扣才算锁上；拔出后门可打开。", options:[["outside","外侧可直接把横闩插入锁扣"],["inside","要解释内侧横闩如何被插入锁扣"]] },
    { page:"bnb-injury", clue:"injury", title:"后续检验报道", field:"death", label:"死亡与火灾", quote:"死亡发生在火起之前，烧伤并非本案的死亡原因。", options:[["before","火起前已经死亡"],["during","死于火灾"],["after","火灭后死亡"]] },
    { page:"bnb-method", clue:"forensics", title:"高温与手势", field:"hand", label:"发现时的手势", quote:"它本身不能说明死者生前是否抓握过物件。", options:[["intent","能证明生前主动抓握"],["heat","可能与受热变化有关，不能据此认定主动抓握"]] }
  ];
  const openedCaseSources = () => caseSources.filter(item => state.case.clues[item.clue]);
  const bnbReady = () => ["latch", "forensics", "injury"].every(id => Boolean(state.case.clues[id]));
  // 入学目录、旧案摘记和交接附件等跨人物材料，等六个人的副本都进入后再出现。
  const archiveRootReady = () => state.backupUnlocked;
  const finalGateReady = () => state.backupUnlocked && state.reading.furthest >= readingPages.length - 1;
  const continuityReady = () => finalGateReady() && continuity.hasAll(state.nameReview.submitted);
  const continuityPending = () => continuity.layerIds.filter(id => !state.nameReview.completed.includes(id));
  const checkedAnswer=state.nameReview.checkedAnswer;
  const sameCheckedAnswer=checkedAnswer&&checkedAnswer.raw===state.nameReview.draft;
  let nameFeedback = sameCheckedAnswer&&typeof checkedAnswer.text==='string' ? checkedAnswer.text : "";
  let nameFeedbackKind = sameCheckedAnswer&&['error','partial','success'].includes(checkedAnswer.kind) ? checkedAnswer.kind : "error";
  const recordedNames = () => state.nameReview.draft === null || typeof state.nameReview.draft !== "string" ? continuity.people.filter(p => state.nameReview.submitted.includes(p.id)).map(p => p.name).join("、") : state.nameReview.draft;
  const identityHints = [
    "十七岁，没有去成的学校。二十岁，没有上完的夜班。二十三岁，第一张自己买的唱片。二十八岁，第一把属于自己的钥匙……",
    "花梗上绕着两圈蓝线。\n一份记录说，自己把它留在了桌上。\n另一份记录说，回家以后换了锁。\n\n桌下的录音装置也是一样。",
    "湖畔那一夜，一份记录记得火是怎样烧起来的，门又是怎样锁上的。\n另一份记录，听见巨响，跟着人群跑了出去，却说不清自己为什么在那个村子。\n\n闪金村以后，同样的空白又出现了一次。",
    "一个名字，只够认回一段。\n\n把这十一页里属于她的姓名，写在同一份回答里。不要替她落下谁。"
  ];
  // 旧存档保留已经出现的提示；首条之后可主动求助，不必制造新的错误。
  const identityHintIndex = () => {
    const count=state.nameReview.wrongSubmissions.length;
    const earned=count>=15?3:count>=12?2:count>=9?1:count>=6?0:-1;
    return Math.max(earned, state.nameReview.hintLevel);
  };
  const continuityNamesForm = () => {
    const solved=continuity.hasAll(state.nameReview.submitted), hintIndex=identityHintIndex();
    const feedbackText=solved ? "回答正确。" : nameFeedback;
    const feedbackKind=solved ? "success" : nameFeedbackKind;
    const feedback=feedbackText ? '<p id="final-error" class="name-feedback '+feedbackKind+'" role="status" aria-live="polite">'+escapeHtml(feedbackText)+'</p>' : '<p id="final-error" class="name-feedback" role="status" aria-live="polite"></p>';
    const hint=hintIndex>=0&&!solved?'<aside class="identity-hint" aria-label="提示 '+(hintIndex+1)+' / 4"><b>提示 '+(hintIndex+1)+' / 4</b>'+paragraphs(identityHints[hintIndex])+(hintIndex<identityHints.length-1?'<button class="system-button" type="button" data-action="identity-hint-next">查看下一条提示</button>':'')+'</aside>':'';
    return '<section class="continuity-names"><p class="identity-letterhead">程守衡留给沈知返的问题</p><form data-form="unlock-final"><label class="field"><span class="identity-question">所以，你到底是谁？</span><textarea name="names" aria-label="回答所以你到底是谁" rows="4" autocomplete="off" maxlength="180" '+(solved?'readonly aria-readonly="true"':'')+'>'+escapeHtml(recordedNames())+'</textarea></label><p class="identity-scope">这份回答只需要刚刚读完的11页原件。邮件和网页里没有新的答案。</p>'+feedback+'<span id="name-save-status" class="draft-status" role="status">输入内容已保存</span>'+hint+(solved?'<button class="system-button primary" type="button" data-action="open-continuity">打开程守衡留下的记录</button>':'<button class="system-button" type="submit" name="operation" value="verify">提交回答</button>')+'</form></section>';
  };
  const continuityModuleView = id => {
    const module = window.__doctorPages[id];
    const person = continuity.modules[id].person;
    const recorded = person && state.nameReview.submitted.includes(person);
    const body = recorded && module.recordedBody ? module.recordedBody : module.body;
    return '<article class="continuity-module"><p class="faint">程守衡 · 2008.07.04 · 会谈后留存</p><h1>' + escapeHtml(module.title) + '</h1>' + paragraphs(body) + '</article>';
  };

  const continuityView = () => {
    if (!continuityReady()) return '<p class="system-message">请打开“你是？”文件。</p>';
    const current = state.nameReview.current;
    const index = continuity.layerIds.indexOf(current);
    const labels = { core: "会谈记录", recorder: "留下纸条的人", original: "更早的名字" };
    const finalButtonLock = !continuity.canAdvance(state.nameReview.submitted, current) ? ' disabled aria-disabled="true"' : "";
    return `<section class="continuity-view"><nav class="continuity-nav reader-toolbar" aria-label="交接夹页"><button class="plain-link" data-action="reading-review">← 回看原件</button>${continuity.layerIds.filter(id => id === current || state.nameReview.completed.includes(id)).map(id => `<button class="plain-link" data-action="review-page" data-page="${id}" ${id === current ? 'aria-current="page"' : ""}>${labels[id]}</button>`).join("")}</nav><div class="reader-pages">${continuityModuleView(current)}</div><footer class="continuity-actions reader-toolbar">${index ? '<button class="system-button" data-action="review-page" data-page="' + continuity.layerIds[index - 1] + '">上一页</button>' : ""}<button class="system-button primary" data-action="name-review-next"${finalButtonLock}>${index === 2 ? "打开后附来信" : "翻到下一页"}</button>${state.finalUnlocked ? '<button class="plain-link" data-action="open-final-mail">返回交接信</button>' : ""}</footer></section>`;
  };
  const markCaseClue = id => { if (id) state.case.clues[id] = true; };

  const legacyAccounts = {
    xuzhaoran: {
      name: "许昭然", account: "xuzhaoran",
      drafts: [
        ["空", "第六天夜里", "不是一直没有出门。窗帘一直没有拉开，门开过。\n\n第六天夜里，我去找过他的车。不是想再谈一次，是想让他们回不来。车后来失控，不是天气替我报了仇。\n\n第七天，报纸从门缝塞进来，我才知道两个人都死了。报上只写事故。我读了几遍，没看见自己的名字。\n\n这页不发给任何人。\n\n催债的信又来了，称呼写得很客气。我把报纸压在底下。那两个人死了，明天要还的钱一分也没有少。"],
        ["空", "不是我", "他们说，要不是我喜欢过他，后面那些事就不会发生。\n\n我说照片不是我给人看的。他们又问，那你为什么让他拍。\n\n话总是停在这里。\n\n后来我去过一次公司。门口堆着石楠花，保安说不是他们订的，问是不是我送来的。我说不是。他看了看我，又看那些花。\n\n我本来还想问是谁送的，没问就走了。\n\n给报社的申述写到这里就够了。车的事，我没有写。"],
        ["父亲", "录取通知书", "爸：\n\n通知书我收好了。你别再说厂里的账没事，我听见你和人打电话了。\n\n你随信寄来的剪页我收着。《黄金时代》今年得了联合报的小说奖，你圈住“今年”两个字，说我也能把日子过好。我十七岁，还不想就这样把往后的日子定下来。\n\n学校我先不去了。等家里缓过来再说。\n\n你不用回。"]
      ],
      files: [["旧论坛头像_勿转发.jpg", "一张早年论坛活动照。年轻的许昭然穿浅色衬衫，背景被闪光灯照得发灰；图片下方只写着“第七天再开窗”。", "./assets/gongpaizhao-xuzhaoran-v1.png"]]
    },
    jiangci: {
      name: "江辞", account: "jiangci",
      drafts: [
        ["空", "白班和夜班", "白天收银 晚上去酒吧 换了城 那笔债还在\n\n后来我也跟客人出去 回来数钱 够还多少 留多少买饭 数完才睡"] ,
        ["空", "别写成爱情", "报纸上那句感情纠葛 我看了好几遍\n\n她说照片不是她给别人看的 后面却全在问她为什么肯让人拍\n\n我给报社写了信 写到一半 把自己的事删掉了 那封是替她说的\n\n后来在公司门口看见那束花 我站了很久\n\n她有没有看见 我不知道 别又替她说原谅了"],
        ["房东", "退租", "405的门锁不用再说没问题 我已经搬走了 押金的事按原来讲的办\n\n那次报警不是我报的 你别又打来问我\n\n你说后来的住户也想多了 那就让她自己说 我没在屋里 没看见她说的花\n\n我住的时候 你也说锁好着呢\n\n钥匙已经还了 这句话不用再跟我说"]
      ],
      files: [["读者来信头像.jpg", "投稿邮箱里附带的一张小头像。短发，侧脸，图片底部的署名被裁掉一半。", "./assets/zhengjianzhao-jiangci-v1.png"]]
    },
    ruanxinran: {
      name: "阮信然", account: "ruanxinran",
      drafts: [
        ["自己", "他们问的不是花", "我习惯先点头，等人走了，才想起刚才也可以说不。把门关上，再把笑放下来。\n\n先把雁江那五个人的话写下。不然下一次，我又会先替他们找理由。\n\n带头的说，他当年看见我在安南那辆车旁边，知道后来车上的两个人都死了。我说我没有，他说名字换了也没用。\n\n信里故意不写车。他们知道说车我就不会去，却肯让我以为他们知道花的事。\n\n他们要我继续见人、带人去约好的地方，再由他们向人要钱。不做，就把那辆车的事交出去。后来每一笔都记在会所的账里。\n\n我没见过他们说的目击材料。我不能把自己的那几天说明白，也不敢去赌他们手里到底有没有。是这个让我一直没走，不是我欠他们的钱。"],
        ["空", "那封信", "信上那句“我能帮你”，我看了好多遍。花的事没人肯听，我以为总算有人知道了。\n\n出门前还看了一次门牌，怕记错地方，让人白等。\n\n后来我把信撕了。信封没撕，上面有地址，我怕有一天要说起那次的事，又连自己去过哪里都说不清。\n\n现在它压在抽屉最底下。每次找东西摸到信封，我都知道里面已经空了，还是不想拆开。"],
        ["自己", "别再道歉", "不要再跟他们说对不起。\n\n花不是你买的，门也不是你开的。\n\n就算你真的记错了，也不该有人因为这个进来吓你。\n\n明天去把锁换掉。换完再回家。"]
      ],
      files: [["酒吧排班表_复印件.jpg", "被折过多次的夜班排班表，纸面受潮，两个班次已无法辨认。角落压着一张旧唱片内页，只露出 DAVIDTAO 的字样。"], ["租房论坛头像.jpg", "长发、素色针织衫的论坛头像。镜头前的人明显回避直视。", "./assets/zufangdengji-ruanxinran-v1.png"]]
    },
    fangxingzhi: {
      name: "方行止", account: "fangxingzhi",
      drafts: [
        ["空", "结算", "雁江那五个人分钱，账里没有我的那一份。让我去的时候说是帮忙，不肯去的时候就提那辆车。到最后，连欠多少都由他们说。\n\n监听器找到以后，我没去问老板。钱还在他的账上，一问，可能就动不了了。\n\n我先转现金，再按底单结了几笔工资。来领钱的人签过字，哪天领的、领了多少，都能对上。\n\n剩下的钱是我拿的。给他们结了工资，不等于剩下的就该归我。这一笔，我没记进底单。\n\n老板也是我杀的，跟周济川是两件事。周后来死了，不能替我认这一件。\n\n原来跟着老板的四个人还在。走的时候，我没有留地址。"],
        ["自己", "别回去", "没有人亲口认过那只监听器。\n\n我是在桌子底下摸到的。我认定是老板装的，因为那间屋子、那些钱，他都要管。现在问我还有什么凭据，我拿不出来。\n\n那天我没有拿着它去问他。把线收起来的时候，我已经决定走了。\n\n这几天总在想，他要是说不是呢。\n\n人已经死了。我还留着那只东西。"]
      ],
      files: [["监听器.jpg", "一只手掌托着小型有线监听器，细线伸出画面外。没有拍摄时间、没有型号、没有“谁安装”的文字说明。"], ["新房钥匙和电视截图.jpg", "茶几上的新房钥匙、半露的现金信封、正在播放体育新闻的旧电视。屏幕上可辨认篮球选秀现场与 YAO 的一角字幕。"]]
    },
    qixiangsheng: {
      name: "祁向生", account: "qixiangsheng",
      drafts: [
        ["空", "原片", "原片里不是我的脸。\n\n是车后面那条路。雁江老板死后，剩下四个人。我约了那四个人，他们是以前跟着雁江老板的人。我知道他们不会再回来，报纸还在写失踪。\n\n搬去外市公寓以后，门下收到那张提醒，说有人戴帽子和墨镜打听405。我认定是他们找到了住处。我没有见到打听的人，也没有去问居委会有没有认错。\n\n我先动了手。以为这样就不用再看身后。\n\n后来换地方，换过脸，开始给报社拍照。车留下的那张底片也在。我裁掉路，交出去一辆谁都能拍到的车。\n\n可我知道原片为什么是从那个方向拍的。\n\n照片裁掉路，报道却还留着“痕迹”两个字。我换过脸，不知道那些东西是不是也认不出我了。"],
        ["空", "名字", "有人敲门，我没出声。\n\n换过名字，换过地方，后来连脸都换过一次。门外真要叫人，也该叫我现在的名字。\n\n我还是等着，听他会叫哪一个。\n\n直到脚步下了楼。"]
      ],
      files: [["摄影展工作牌_复印件.jpg", "摄影展志愿者工作牌，短发，五官和许昭然明显不同。高领和阴影挡住耳后；卡片编号前缀与祖安村新闻配图文件名相同。"], ["居委会提醒_转抄.txt", "外市高层公寓405住户：\n\n近日有戴帽子、墨镜的人在附近打听住户情况。不知是否为您的熟人，请留意。如有安全问题，请及时反映。\n\n本条不含来访者姓名，没有认定来访者属于任何团伙。"], ["祖安民俗摘录.pdf", "村里老人说，火能送走不肯离开的人。\n\n但送走的是人，留下的是问的人。"]]
    },
    sunianci: {
      name: "苏念慈", account: "sunianci",
      drafts: [
        ["空", "出门前", "她又在门口等。饭放凉了，她说女儿快回来了，不肯先吃。\n\n我把报纸收进柜子。过一会儿又拿出来，看那句“他们会找到母亲”。报道里没有人说要来，可我已经在想，门响了怎么办，她又会跟人说些什么。\n\n我对自己说，她经不起这些了。没有问过医生，也没有问她。我怕他们借她找到我，这一句一直没肯写。\n\n出门时我说去走走。她还惦记着饭，说回来热一热就能吃。\n\n我已经想到了那条路的尽头，没有告诉她。\n\n她只是让我慢些走。"],
        ["季念真", "山路", "季念真：\n\n祖安那张剪报旁边写着“他们会找到母亲”。我以为是你留下的。报纸只说痕迹，我却把那句话当成了已经有人在找她。\n\n我带她上山。她那天一直叫错名字，看着我，像在等另一个女儿回来。\n\n不是她自己失足。是我推了她。\n\n下山以后，衣服洗了，鞋擦了。饭还在桌上，我连锅一起放进冰箱，隔天才倒掉。\n\n她用过的杯子没收。\n\n你总说做完就会安静。我把柜子关上，坐了一会儿，又去看杯子放好了没有。"],
        ["空", "塞壬", "我只在剪报里见过这个名字。是谁起的，我不知道。\n\n柜子里那张报纸要另放。别再和母亲的照片装一个袋子，找一张照片，就要把那些标题再看一遍。"]
      ],
      files: [["山路_原图.jpg", "雾天山路，远处护栏有缺口。画面里没有人；右下角湿玻璃只映出摄影者模糊的一角。"], ["祖安剪报_页边抄录.txt", "剪报正文：车内生物痕迹来源未能完全确认。\n\n页边两种字：“带自己的样本，能不能查出我是谁？”；“他们会找到母亲”。\n\n页边没有署名及日期。该句话不在报道正文内，也不是警方认定。"], ["诊疗所便签扫描.jpg", "程守衡医生\n7 月 4 日诊后建议：记下最近记不清的事情，复诊时带来。"]]
    }
  };

  // 账户页只显示原先随本机索引保存的线索，不新增剧情，也不把线索当成结论。
  const accountTraces = {
    xuzhaoran: { time: null, echo: "家信夹页：十七岁；《黄金时代》获奖的报纸剪页随信寄来。" },
    jiangci: { time: null, echo: "夜班交接纸：二十岁；收音机里巴西对意大利，直播还没结束。" },
    ruanxinran: { time: null, echo: "唱片内页：二十三岁买的新唱片；花出现于下一年春天。" },
    fangxingzhi: { time: null, echo: "旧账页夹有一张未报到的录取通知书复印件；姓名栏被反复涂改。" },
    qixiangsheng: { time: null, echo: "居委会提醒只说有人打听405，没有认定来访者。新闻的配图后来才补上。" },
    sunianci: { time: null, echo: "今年五月的照片和几年前的剪报分袋保存。照片旁的杯子一直没换过。" }
  };
  const accountTechnicalTraces = {
    xuzhaoran: { label: "恢复号码末位", value: "139****2716" },
    jiangci: { label: "恢复号码末位", value: "139****2716" },
    ruanxinran: { label: "常用设备", value: "MAILBOOK-08 / 邮件助手" },
    fangxingzhi: { label: "常用设备", value: "MAILBOOK-08 / 邮件助手" },
    qixiangsheng: { label: "首次验证设备", value: "MB08-0717-A" },
    sunianci: { label: "首次验证设备", value: "MB08-0717-A" }
  };

  // 六月旧清单保留；七月会谈文件另列于顺序阅读末尾。
  legacyAccounts.sunianci.files[2] = ["归还清单.txt", "相机：擦过，仍在柜子里。\n镜头盖：另装在小袋里。\n母亲的杯子：洗过，放回原处。\n\n相机等人来取。杯子不归还。"];
  // 原片本就由祁保管；这里补成可单独打开的附件，公开检索不含此文件。
  legacyAccounts.qixiangsheng.files.push(["祖安车辆_原片范围.txt", "祁向生附记：原片没交。车可以给他们看，后面的路不行。\n\n原始拍摄时间字段未保留。"]);
  const evidenceReader = item => window.__evidenceReader?.render(item, state.evidenceView, state.evidenceZoom) || "";

  // 姓名来自信稿落款或证件原栏，不再由索引一开即揭示。
  legacyAccounts.jiangci.drafts[2][2] += "\n\n江辞";
  legacyAccounts.sunianci.drafts[1][2] += "\n\n苏念慈";
  legacyAccounts.qixiangsheng.files[0][1] += "\n\n工作牌姓名栏：祁向生。";
  const nameEvidence = {
    enrollment: "xuzhaoran",
    "legacy:jiangci:drafts:2": "jiangci",
    "flower-complaint": "ruanxinran",
    "new-room": "fangxingzhi",
    "legacy:qixiangsheng:drafts:0": "qixiangsheng",
    "legacy:sunianci:drafts:1": "sunianci"
  };

  for (const draft of legacyAccounts.jiangci.drafts) draft[2] = draft[2].replace(/[，。；]/g, "\n").replace(/\n{3,}/g, "\n\n");
  // 全文检索只查已恢复的真实文件；入口在六封往来读完后出现。
  // 复用原稿，不另写一套“证据摘要”；入学夹页和最终自白仍不在此索引。
  const archiveScopes = { all: "全部旧资料", records: "散页", drafts: "未发送草稿", files: "附件" };
  const archiveCatalog = [
    ...(investigation?.records || []).map(item => ({ ...item, kind: "records" })),
    ...Object.entries(legacyAccounts).flatMap(([accountId, account]) => [
      ...account.drafts.map(([recipient, title, body], index) => ({
        id: `legacy:${accountId}:drafts:${index}`, account: accountId, kind: "drafts", index,
        title, author: account.name, recipient, body, indexedYear: null,
        source: `${account.name} / 未发送草稿 / ${title}；原稿未署年`
      })),
      ...account.files.map(([title, body, image], index) => ({
        id: `legacy:${accountId}:files:${index}`, account: accountId, kind: "files", index,
        title, author: account.name, body, image, indexedYear: null,
        source: `${account.name} / 附件 / ${title}；原始时间属性未保留`
      }))
    ])
  ];
  const enrollmentRecord = archiveCatalog.find(r => r.id === "enrollment");
  if (enrollmentRecord) enrollmentRecord.body = enrollmentRecord.body.split("沈知返整理附记")[0].replace(/————\s*$/, "").trim();
  investigation.enrollmentPacket.body = investigation.enrollmentPacket.body.split("沈知返整理附记")[0].replace(/————\s*$/, "").trim();
  archiveCatalog.push({ ...investigation.enrollmentPacket, id: "enrollment-packet", title: "录取通知书与夹页", account: "xuzhaoran" });
  archiveCatalog.push({id:"case-notes",title:"旧案摘记",author:"沈知返",body:caseNotebook.filter(r=>!r.date.startsWith("2008.07")).map(r=>r.date+"\n"+r.body).join("\n\n"),kind:"records"});
  archiveCatalog.push({id:"case-letters",title:"未寄出：给母亲",author:"季念真",body:unsentCaseLettersReadable.replace("我利用观察位置和镜面做出了那个样子。", "我安排了现场，利用人们看不清的地方编造传闻。"),kind:"records"});
  const archiveRecord = id => archiveCatalog.find(item => item.id === id);

  // The public school route remains retired; its factual clipping is preserved with the private notebook.
  const schoolSavedClip = {id:"school-saved-clip",title:"夹在摘记后的旧报",source:"2005年4月旧报节选 · 刊载日缺失",body:"4月5日，警方收到一封署名‘塞壬’的来信。次日清晨，闪金村废弃学校发现七名死者，其中包括学生和一名警务人员。\n\n目前没有证据表明遇害学生与雁江会所有往来。有关‘鬼校’的说法并非死因说明。"};
  archiveCatalog.push(schoolSavedClip);
  const novelOriginal = {id:"novel-original",title:"等屋里暖起来 · 存稿扉页",source:"原目录：写作文件 / 等屋里暖起来.txt",body:"季念真\n网络署名：迟到的读者\n2004.12.20\n\n正文从‘屋子冷得像一口没有盖好的井’起，到‘她站在楼下，等屋里暖起来’止。\n\n已发纸页文学。后续未写。"};
  archiveCatalog.push(novelOriginal);
  const writerContact = {id:"writer-contact",title:"旧信摘抄",source:"季念真存稿夹页 · 2004.12.24",body:"周济川来信：\n\n‘你以前寄来那篇稿子，信封和回信地址我还留着。雁江材料里也有这个名字。我想你会愿意先和我谈，不必让其他笔友知道。’\n\n‘我也去湖畔。你要取的那一份，我带着。钱带齐，到了单独说。’\n\n回信未发：\n\n我会去。拿回材料以后，你把信封也还给我。\n\n季念真"};
  archiveCatalog.push(writerContact);
  const readingPages = window.__linearArchive.build(archiveCatalog);
  const backupNote = archiveRecord("backup-note");
  // Obsolete face comparisons must not remain visible through old saved attachment links.
  for (const r of archiveCatalog) if (/头像|工作牌/.test(r.title)) delete r.image;
  if (!state.reading || typeof state.reading !== 'object') {
    const legacyProgress = continuity.hasCore(state.nameReview.submitted) || state.finalUnlocked;
    const lastOpened = readingPages.reduce((last,p,i)=>p.items.some(r=>state.archive.opened.includes(r.id))?i:last,0);
    state.reading={version:window.__linearArchive.version,index:legacyProgress?readingPages.length-1:lastOpened,furthest:legacyProgress?readingPages.length-1:lastOpened,returnTo:null};
  }
  if(state.reading.version!==window.__linearArchive.version){
    window.__linearArchive.migrate(state.reading,continuity.hasCore(state.nameReview.submitted)||state.finalUnlocked);
    for(const key of Object.keys(state.appScrolls||{}))if(key.startsWith('documents:reading:'))delete state.appScrolls[key];
  }
  state.reading.index=Math.max(0,Math.min(readingPages.length-1,Number(state.reading.index)||0));
  state.reading.furthest=Math.max(state.reading.index,Math.min(readingPages.length-1,Number(state.reading.furthest)||0));
  const readingFormat = item => {
    if(item.id==='legacy:qixiangsheng:files:0')return ['credential','工作牌复印件'];
    if(['enrollment','case-letters','enrollment-packet'].includes(item.id)||item.kind==='drafts'&&item.recipient&&!['空','自己'].includes(item.recipient))return ['letter','信稿与夹页'];
    if(item.id==='session-cover')return ['session','会谈留存'];
    if(item.id==='backup-note'||/清单/.test(item.title))return ['list','保存清单'];
    if(/剪报/.test(item.title))return ['clipping','剪报与附记'];
    if(item.image||/照片|原图|头像/.test(item.title))return ['photo','照片与附记'];
    return ['notes',item.kind==='drafts'?'未发送草稿':'笔记与散页'];
  };
  const readingTranscript = item => {
    if(item.id==='legacy:qixiangsheng:files:0') {
      const match=item.body.match(/工作牌姓名栏：([^。\n]+)/);
      if(match)return '<section class="source-credential"><p class="credential-heading">摄影展 · 志愿者工作牌</p><dl><dt>姓名</dt><dd>'+escapeHtml(match[1])+'</dd></dl></section>'+paragraphs(item.body.replace(match[0]+'。',''));
    }
    return item.body.split(/\n\n/).map(part=>{
      if(/^—{2,}$/.test(part.trim()))return '<hr class="source-divider">';
      const signature=/^(?:—{1,2})?(?:许昭然|江辞|阮信然|方行止|祁向生|苏念慈|沈知返|季念真|程守衡)(?:\n[^\n]*)?$/.test(part.trim());
      return '<p'+(signature?' class="source-signature"':'')+'>'+escapeHtml(part).replace(/\n/g,'<br>')+'</p>';
    }).join('');
  };
  const readingView = () => {
    if(!state.backupUnlocked)return '<p>此文件尚未解密。</p>';
    const n=state.reading.index, p=readingPages[n];
    const nav='<nav class="reading-nav reader-toolbar" aria-label="原件翻页"><button class="system-button" data-action="reading-prev" '+(n?'':'disabled')+'>上一页</button><span>第 '+(n+1)+' / '+readingPages.length+' 页</span><button class="system-button" data-action="'+(n===readingPages.length-1?'reading-identity':'reading-next')+'">'+(n===readingPages.length-1?'打开姓名记录':'下一页')+'</button></nav>';
    const index='<details class="reading-index" open><summary>回看已读页</summary>'+readingPages.slice(0,state.reading.furthest+1).map((page,i)=>'<button class="plain-link reader-thumbnail" data-action="reading-jump" data-index="'+i+'" '+(i===n?'aria-current="page"':'')+' aria-label="第'+(i+1)+'页 '+escapeHtml(page.title)+'"><span class="thumbnail-number" aria-hidden="true">'+(i+1)+'</span><span class="thumbnail-paper" aria-hidden="true"><span>'+escapeHtml(page.title)+'</span><i>'+escapeHtml(page.items.map(item=>item.body).join('\n\n').slice(0,700)).replace(/\n/g,'<br>')+'</i></span></button>').join('')+'</details>';
    return '<section class="sequential-reader">'+nav+'<div class="reader-workspace"><aside class="reader-page-map">'+index+'</aside><div class="reader-main">'+((n===0||state.reading.returnTo)?'<div class="reader-file-controls">'+(n===0?'<p class="backup-read-status" role="status">解压完成 · 连续阅读原件后，核对留下自述的人名</p>':'')+(state.reading.returnTo?'<button class="system-button" data-action="reading-return">返回姓名与会谈记录</button>':'')+'</div>':'')+'<div class="reader-pages">'+(p.portrait?'<figure class="reading-portrait"><img src="'+p.portrait+'" alt="沈知返"><figcaption>沈知返</figcaption></figure>':'')+p.items.map(item=>{
      const media=item.linearText?'':evidenceReader(item); const source=item.id.startsWith('legacy:')?'原目录：'+threadDisplayName(item.account)+' / '+(item.kind==='drafts'?'未发送草稿':'附件'):(item.source||'本机保存件');
      const [format,label]=readingFormat(item);
      return '<article class="reading-original source-'+format+'"><header class="source-file-header"><span>'+label+'</span><small>'+escapeHtml(source)+'</small></header><div class="source-sheet"><h1>'+escapeHtml(item.title)+'</h1>'+(media||(item.image?'<img class="attachment-image" src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.title)+'">':''))+(!media?'<div class="source-transcript">'+readingTranscript(item)+'</div>':'')+'</div></article>';
    }).join('')+'</div></div></div>'+nav+'</section>';
  };
  const openReading = (index=state.reading.index) => {
    state.reading.index=Math.max(0,Math.min(readingPages.length-1,index));state.reading.furthest=Math.max(state.reading.furthest,state.reading.index);
    for(const r of readingPages[state.reading.index].items)if(archiveRecord(r.id))rememberArchiveRecord(r);
    state.currentApp='documents';state.document='reading';if(!state.openApps.includes('documents'))state.openApps.push('documents');save();render();
  };
  const archiveRecordAccounts = Object.freeze({
    flowers: "ruanxinran",
    recorder: "fangxingzhi",
    asking: "qixiangsheng",
    "identity-inquiry": "sunianci",
    margin: "sunianci",
    cups: "sunianci",
    radio: "jiangci",
    album: "ruanxinran",
    "new-room": "fangxingzhi",
    notice: "qixiangsheng",
    enrollment: "xuzhaoran"
  });
  const recordAvailable = item => Boolean(item && archiveAvailable()
    && (!item.directory || archiveRootReady())
    && (
      archiveEntryAvailable()
      || (item.account ? accountRecovered(item.account) : accountRecovered(archiveRecordAccounts[item.id]))
      || (archiveRootReady() && ["case-notes", "enrollment"].includes(item.id))
    ));
  const enrollmentAvailable = () => archiveRootReady();
  const archiveMetadata = item => {
    if (!item || !item.account || state.knownNames[item.account]) return item;
    const name = legacyAccounts[item.account].name;
    return { ...item, author: item.author.replaceAll(name, threadDisplayName(item.account)), source: item.source.replaceAll(name, threadDisplayName(item.account)) };
  };
  // 恢复以前已读到的实名依据，但不把“目录打开过”当成已经知道全部人名。
  for (const id of state.archive.opened) if (nameEvidence[id]) state.knownNames[nameEvidence[id]] = id;
  if (!Object.hasOwn(archiveScopes, state.archive.scope)) state.archive.scope = "all";
  const rememberArchiveRecord = item => {
    if (!item) return;
    if (!state.archive.opened.includes(item.id)) state.archive.opened.push(item.id);
    if (nameEvidence[item.id]) state.knownNames[nameEvidence[item.id]] = item.id;
    recordInvestigation("本机原记录", `${archiveMetadata(item).author}｜${item.title}`);
  };
  const showArchiveRecord = id => {
    const item = archiveRecord(id); if (!recordAvailable(item)) return;
    rememberArchiveRecord(item); state.archive.selected = id;
    state.currentApp = "mail"; state.mail.view = "record";
    if (!state.openApps.includes("mail")) state.openApps.push("mail");
    save(); render();
  };


  // 当前人物的旧资料只走一条直达路径：点击后完成本组只读恢复，
  // 直接打开对应原件，不把“检查路径／挂载目录／读取完成”拆成多层系统页。
  // 仍保留逐组 recoveredAccounts 状态，不能因此提前接通其他人物或终局目录。
  const openPersonArchive = () => false;


  const shell = (title, content, kind = "app") => {
    const visibleApps = [...new Set([...state.openApps, ...(kind === "desktop" ? [] : [state.currentApp])])];
    const windowTitle = state.currentApp === "system"
      ? systemWindowTitle()
      : title === "浏览器" ? `${browserRouteTitle(state.browser)} - Microsoft Internet Explorer` : title === "Mail Assistant" ? "Outlook Express" : title;
    return `
    <section class="computer" aria-label="2008 年旧笔记本桌面">
      <div class="desktop-icons" aria-label="桌面应用">
        <button class="desktop-icon" data-action="open-app" data-app="documents">${xpIcon("documents")}<span>我的文档</span></button>
        <button class="desktop-icon desktop-static" data-action="desktop-item" data-item="computer">${xpIcon("computer")}<span>我的电脑</span></button>
        <button class="desktop-icon desktop-static" data-action="desktop-item" data-item="network">${xpIcon("network")}<span>网上邻居</span></button>
        <button class="desktop-icon desktop-static" data-action="desktop-item" data-item="recycle">${xpIcon("recycle")}<span>回收站</span></button>
        <button class="desktop-icon desktop-shortcut" data-action="open-app" data-app="browser">${xpIcon("browser")}<span>Internet<br>Explorer</span></button>
        <button class="desktop-icon desktop-shortcut" data-action="open-app" data-app="mail">${xpIcon("mail")}<span>Outlook<br>Express</span></button>
      </div>
      ${saveWarning ? `<div class="save-warning" role="alert">${escapeHtml(saveWarning)} <button data-action="retry-save">重试保存</button></div>` : ""}
      ${state.desktopNotice ? `<div class="desktop-notice" role="status">${escapeHtml(state.desktopNotice)}</div>` : ""}
      ${kind === "desktop" ? content : `<section class="window ${state.windowRestored ? "window-restored" : "window-maximized"}" aria-label="${escapeHtml(title)}"><div class="window-titlebar"><i class="tiny-icon"></i><span class="window-title-text">${escapeHtml(windowTitle)}</span><div class="window-controls"><button aria-label="最小化" data-action="minimize">−</button><button aria-label="${state.windowRestored ? "最大化" : "还原"}" data-action="window-size">${state.windowRestored ? "□" : "▣"}</button><button class="window-close" aria-label="关闭" data-action="close">×</button></div></div>${menuBar(title)}<div class="window-body">${content}</div>${content.includes("browser-layout") ? `<div class="native-statusbar"><span>完成</span><span>${state.currentApp === "documents" ? "我的电脑" : "Internet"}</span></div>` : ""}</section>`}
      ${aboutWindow ? `<div class="ui-modal-backdrop"><section class="ui-about" role="dialog" aria-modal="true" aria-label="关于"><h2>关于</h2><p>${escapeHtml(windowTitle || "Windows XP")}</p><p>Microsoft Windows XP<br>脱机工作</p><button class="system-button" data-action="ui-about-close">确定</button></section></div>` : ""}${state.startMenuOpen ? startMenu() : ""}
      <footer class="taskbar"><button class="start-button" data-action="toggle-start"><i class="start-mark" aria-hidden="true"><b></b><b></b><b></b><b></b></i>开始</button><div class="quick-launch"><button aria-label="显示桌面" data-action="show-desktop">${xpIcon("showDesktop")}</button><button aria-label="打开浏览器" data-action="open-app" data-app="browser">${xpIcon("browser")}</button></div><div class="task-items">${visibleApps.map(appId => taskItem(appId, kind !== "desktop" && state.currentApp === appId)).join("")}</div><div class="tray"><span class="tray-shield" aria-hidden="true"></span><span class="tray-volume" aria-hidden="true"></span><span title="2008年8月3日 星期日">09:18</span></div></footer>
    </section>`;
  };

  const intro = () => '<section class="boot-stage wig-opening"><header class="opening-title"><div class="opening-width"><div class="opening-topline"><span>网页调查游戏</span><span>2008 / 08 / 03</span></div><h1>非本人<span>回复</span></h1><p>她没有赴约。电脑留在了家里。</p></div></header><div class="opening-width opening-content"><article class="opening-story" aria-labelledby="opening-story-title"><h2 id="opening-story-title"><span>01</span> 引言</h2>'+paragraphs(flow.intro)+'</article><section class="opening-guide" aria-labelledby="opening-guide-title"><h2 id="opening-guide-title"><span>02</span> 开始之前</h2><p class="opening-objective">查清她离开前发生了什么，找到她的下落。</p><dl><dt>浏览网页</dt><dd>在 IE 中查找事件、地点和相关用语，阅读这台电脑保存的公开网页。</dd><dt>查找邮件</dt><dd>在 OE 中输入通信署名，查找旧往来。已找到的邮件也可以按正文回查。</dd><dt>继续调查</dt><dd>留意正文、图片说明和附件。新的发现，可能让先前读过的话有了另一层意思。</dd></dl><details class="opening-help"><summary>操作与存档</summary><p>输入搜索内容后，按 Enter 或点击“查找”。没有结果时，先确认搜索框里是这次要查的内容。</p><p>进度自动保存在当前浏览器。刷新会继续；“开始”菜单中的“重新开始游戏”会清除本局进度。</p><p>所有必要操作都在游戏界面内完成，无需查看源代码或修改文件。建议使用电脑游玩。</p></details></section><footer class="opening-enter"><p>从她留下的那封草稿开始。</p><button class="power-button" data-action="power-on">打开电脑 <span aria-hidden="true">→</span></button></footer><p class="opening-colophon">《非本人回复》 · 虚构故事</p></div></section>';

  const desktop = () => shell("", state.archiveCreated ? `<div class="desktop-final-note">请把发生过的事留下来。</div>` : "", "desktop");
  const system = () => shell(systemWindowTitle(), systemWindowBody());

  const login = () => `
    <section class="login-panel"><header class="login-heading"><h1>Outlook Express</h1><p>当前处于脱机状态</p></header>
      <div class="login-form"><h2>沈知返的本机邮件</h2><p>这里保存着这台电脑以前收过的邮件。上一次使用时，邮件程序没有退出。</p><p class="faint">现在不能连接邮箱服务器，只能阅读，不能收发新邮件。</p><div class="login-actions"><button class="system-button" data-action="show-desktop">返回桌面</button><button class="system-button primary" data-action="open-local-mail">打开已保存的邮件</button></div></div>
    </section>`;

  const cacheThread = id => {
    if (!state.mail.cachedThreads.includes(id)) state.mail.cachedThreads.push(id);
  };
  const threadListRows = () => mailOrder.filter(id => state.mail.cachedThreads.includes(id))
    .sort((a,b) => threads[b].messages.at(-1)[2].localeCompare(threads[a].messages.at(-1)[2]))
    .map(id => { const item = threads[id]; return `<tr data-action="open-thread" data-thread="${id}"><td class="mail-state-column"><span class="oe-envelope" aria-hidden="true"></span></td><td><i class="paperclip" aria-hidden="true"></i></td><td class="from">${escapeHtml(threadDisplayName(id))}</td><td class="subject"><button class="mail-subject-button" type="button">${escapeHtml(item.subject)}</button></td><td class="date">${item.latest}</td></tr>`; }).join("");
  const recoveredArchiveRow = () => "";
  const localNotices = [
    ['临川书店','暑期图书订购目录','暑期图书目录已寄出。本期订购现已结束，感谢您的关注。'],
    ['读书会会员服务','会员积分即将到期','本年度会员积分将于月底到期。如已办理兑换，请忽略此邮件。'],
    ['临川晚讯订阅中心','订阅确认：临川晚讯','您已订阅临川晚讯电子版。本邮件由订阅系统发送，请勿直接回复。'],
    ['数码商城','数码相机暑期优惠','暑期数码相机促销活动已结束。商品与价格以门店当天信息为准。'],
    ['旧书交流会','旧书交换活动通知','本期旧书交换活动已结束。下一期安排将在会刊中公布。'],
    ['邮箱服务中心','免费邮箱容量升级','本次邮箱容量升级已经完成，原有邮件与通讯录不受影响。']
  ];
  const mailColumns = (draft=false) => '<thead><tr><th class="mail-state-column" title="邮件状态">✉</th><th class="attachment-marker" title="附件"><i class="paperclip" aria-hidden="true"></i></th><th>发件人</th><th>主题</th><th>'+(draft?'修改时间':'接收时间')+'</th></tr></thead>';
  const localInboxList = selected => '<div class="oe-message-list oe-local-list"><table class="mail-list">'+mailColumns()+ '<tbody>'+threadListRows()+localNotices.map(([from,title],i)=>'<tr class="'+(selected===i?'selected':'')+'" data-action="read-junk" data-index="'+i+'"><td class="mail-state-column"><span class="oe-envelope" aria-hidden="true"></span></td><td></td><td>'+from+'</td><td><button class="mail-subject-button" type="button">'+title+'</button></td><td>2008/7/'+(30-i)+' 09:00</td></tr>').join('')+'</tbody></table></div>';
  const inboxRows = () => '<section class="oe-conversation">'+localInboxList(-1)+'<div class="oe-empty-preview"></div></section>';
  const noticeView = () => {const i=Math.max(0,Math.min(localNotices.length-1,Number(state.mail.noticeIndex)||0));const [from,title,body]=localNotices[i];return '<section class="oe-conversation">'+localInboxList(i)+'<article class="message-view oe-preview"><header class="oe-message-header"><div><b>发件人：</b>'+from+'</div><div><b>收件人：</b>沈知返</div><div><b>发送时间：</b>2008/7/'+(30-i)+' 09:00</div><div><b>主题：</b>'+title+'</div></header><div class="oe-message-body">'+paragraphs(body)+'</div></article></section>';};


  const mailSearchMatches = query => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // 邮件检索只回答“当前可见往来里有没有这段文字”。
    // 终局姓名、旧目录名称和挂载状态不是邮件索引内容，不能成为答案校验器。
    const nonMailTerms = ["季念真", "jinianzhen", "历史副本", "挂载", "入学材料"];
    if (nonMailTerms.some(term => q.includes(term.toLowerCase()))) return [];
    return mailOrder.filter(id => {
      if (!flow.canDiscover(state, id)) return false;
      const thread = threads[id];
      const body = thread.messages.map(item => displayMailBody(id, item[3])).join("\n").toLowerCase();
      const aliasMatch = (threadAliases[id] || []).some(alias => q === alias.toLowerCase());
      const realNameMatch = q === thread.name.toLowerCase();
      if (!visibleThreadIds().includes(id)) return aliasMatch || realNameMatch;
      const textMatch = q.length >= 2 && (thread.subject.toLowerCase().includes(q) || body.includes(q));
      return aliasMatch || realNameMatch || textMatch;
    });
  };
  const canOpenThread = id => state.mail.loggedIn && flow.canDiscover(state, id) && (visibleThreadIds().includes(id) || (
    state.mail.view === "search" &&
    mailSearchMatches(state.mail.query).includes(id)
  ));

  const mailSearchSuggestion = query => {
    const known = mailOrder.filter(id => flow.canDiscover(state, id)).flatMap(id => {
      const alias = threadDisplayName(id);
      // 首次打开本机邮件即显示草稿；其中已经读到的署名也属于已遇见线索。
      const encountered = (id === "xuzhaoran" && state.mail.loggedIn) || visibleThreadIds().includes(id) || state.browser.visitedPages.some(key => {
        if (!pageContent[key]) return false;
        const doc = new DOMParser().parseFromString(pageContent[key](), "text/html");
        return doc.body.textContent.includes(alias);
      });
      return encountered ? [alias] : [];
    });
    return flow.suggestAlias(query, known);
  };

  const searchRows = query => {
    const q = query.trim().toLowerCase();
    const matches = mailSearchMatches(query);
    if (!q) return inboxRows();
    if (!matches.length) {
      const suggestion = mailSearchSuggestion(query);
      return `<table class="mail-list"><thead><tr><th class="from">发件人</th><th>主题</th><th class="date">日期</th></tr></thead><tbody><tr class="mail-no-results"><td colspan="3">没有找到完整匹配。${suggestion ? `<p>是否查找：<button type="button" data-action="mail-use-suggestion" data-query="${escapeHtml(suggestion)}"><strong>${escapeHtml(suggestion)}</strong></button></p>` : `<p>网页中的完整署名，通常也是邮件联系人。</p>`}</td></tr></tbody></table>`;
    }
    const caption=matches.length===1?`找到 ${threads[matches[0]].messages.length} 封往来邮件。<br>联系人：${escapeHtml(threadDisplayName(matches[0]))}`:`找到 ${matches.length} 组匹配的往来。`;
    return `<p class="mail-query-caption">${caption}</p><table class="mail-list"><thead><tr><th class="from">发件人</th><th>主题</th><th class="date">日期</th></tr></thead><tbody>${matches.map(id => { const item = threads[id]; return `<tr data-action="open-thread" data-thread="${id}"><td class="from">${escapeHtml(threadDisplayName(id))}</td><td class="subject"><button class="mail-subject-button" type="button">${escapeHtml(item.subject)}</button>　<span>${escapeHtml(item.preview)}</span></td><td class="date">${item.latest}</td></tr>`; }).join("")}</tbody></table>`;
  };

  const rememberMailSearch = query => {
    const text = query.trim();
    if (!text) return;
    state.mail.searches = [text, ...state.mail.searches.filter(item => item !== text)].slice(0, 8);
  };

  const mailSearchHistory = () => {
    if (!state.mail.searchHistoryOpen) return "";
    if (!state.mail.searches.length) return `<div class="mail-search-history empty">还没有搜索记录。</div>`;
    return `<div class="mail-search-history"><div class="search-history-title">最近搜索</div>${state.mail.searches.map(query => `<button data-action="mail-run-history" data-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join("")}</div>`;
  };

  const mailToolbar = () => `
    <div class="mail-toolbar">
      <div class="oe-toolbar-row" role="toolbar" aria-label="邮件工具栏">
        <span class="oe-tool oe-tool-static"><i class="oe-tool-icon oe-icon-compose" aria-hidden="true"></i><span>新建邮件</span></span>
        <span class="oe-tool oe-tool-static"><i class="oe-tool-icon oe-icon-reply" aria-hidden="true"></i><span>回复</span></span>
        <span class="oe-tool oe-tool-static"><i class="oe-tool-icon oe-icon-replyall" aria-hidden="true"></i><span>全部回复</span></span>
        <span class="oe-tool oe-tool-static"><i class="oe-tool-icon oe-icon-forward" aria-hidden="true"></i><span>转发</span></span>
        <span class="oe-tool oe-tool-static"><i class="oe-tool-icon oe-icon-print" aria-hidden="true"></i><span>打印</span></span>
        <span class="oe-tool oe-tool-static"><i class="oe-tool-icon oe-icon-delete" aria-hidden="true"></i><span>删除</span></span>
        <span class="oe-toolbar-separator" aria-hidden="true"></span>
        <button class="oe-tool oe-tool-action" type="button" disabled title="脱机工作，不能发送或接收邮件"><i class="oe-tool-icon oe-icon-sendrecv" aria-hidden="true"></i><span>发送/接收</span></button>
        <button class="oe-tool oe-tool-action" type="button" disabled title="通讯簿不可用"><i class="oe-tool-icon oe-icon-address" aria-hidden="true"></i><span>通讯簿</span></button>
        <span class="oe-toolbar-separator" aria-hidden="true"></span>
        <button class="oe-tool" type="button" data-action="mail-focus-search" title="查找邮件"><i class="oe-tool-icon oe-icon-find" aria-hidden="true"></i><span>查找</span></button>
      </div>
      <div class="mail-search-row"><span class="mail-search-label">查找邮件：</span><form class="search-box" data-form="mail-search"><input name="query" value="${escapeHtml(state.mail.searchDraft ?? state.mail.query)}" aria-label="搜索邮件" placeholder="联系人署名或真实姓名" autocomplete="off" /><button type="submit">查找</button><button type="button" data-action="mail-clear-search">清空</button><button class="search-history-toggle" type="button" data-action="mail-toggle-search-history" aria-label="最近搜索">▼</button></form></div><p class="mail-search-help" id="mail-search-status" role="status">${typeof state.mail.searchDraft === "string" && state.mail.searchDraft !== state.mail.query ? "搜索内容已更改，按 Enter 或点击“查找”。" : "查找旧联系人时，请使用网页上出现过的署名。记不全，也可以先输入其中几个连续的字。"}</p>${mailSearchHistory()}
    </div>`;

  const mailFolderCaption = () => {
    if (state.mail.view === "self-note") return "草稿箱";
    if (state.mail.view === "legacy-archive") return "历史邮件副本";
    if (state.mail.view === "legacy-account" && state.legacy.account) return `${accountLabel(state.legacy.account)}的副本`;
    if (state.mail.view === "manage") return "账户";
    if (["delivery", "local-data", "migration"].includes(state.mail.view)) return "本机诊断";
    return "收件箱";
  };
  const retainedBackupEntry = () => state.backupAttachmentOpened ? '<section class="oe-retained-attachments"><h2>已打开的附件</h2><button class="oe-retained-backup '+(state.mail.view==='attachment'&&state.mail.attachment?.id==='private-backup'?'active':'')+'" data-action="open-retained-backup" title="旧稿与邮件.zip · '+(state.backupUnlocked?'已解密':'尚未解密')+'"><i class="attachment-file-icon" aria-hidden="true"></i><span><b>旧稿与邮件.zip</b><small>· '+(state.backupUnlocked?'已解密':'尚未解密')+'</small></span></button></section>' : '';
  const mailFolders = () => `<aside class="mail-sidebar"><h2>文件夹</h2><div class="oe-folder-root"><span aria-hidden="true">−</span> Outlook Express</div><div class="oe-folder-group"><span aria-hidden="true">−</span> 本地文件夹</div><div class="oe-folder-list">${archiveEntryAvailable() ? `<button class="folder-button ${["legacy-archive", "legacy-account"].includes(state.mail.view) ? "active" : ""}" data-action="open-legacy-archive"><i class="oe-folder-icon oe-folder-archive" aria-hidden="true"></i>历史邮件副本</button>` : ""}<button class="folder-button ${["legacy-archive", "legacy-account", "self-note"].includes(state.mail.view) ? "" : "active"}" data-action="mail-inbox"><i class="oe-folder-icon oe-folder-inbox" aria-hidden="true"></i>收件箱</button><button class="folder-button ${state.mail.view === "self-note" ? "active" : ""}" data-action="open-self-note"><i class="oe-folder-icon oe-folder-draft" aria-hidden="true"></i>草稿箱 (1)</button><button class="folder-button" disabled title="已保存的发信按往来合并显示"><i class="oe-folder-icon oe-folder-sent" aria-hidden="true"></i>已发送邮件</button><button class="folder-button" disabled title="未保存此文件夹"><i class="oe-folder-icon oe-folder-trash" aria-hidden="true"></i>已删除邮件</button></div>${retainedBackupEntry()}<div class="oe-folder-footer">本机账户<br><span>脱机工作</span></div></aside>`;
  const mailFrame = content => {
    const emptyMailSearch = state.mail.view === "search" && state.mail.query.trim() && mailSearchMatches(state.mail.query).length === 0;
    return `<div class="oe-client">${mailToolbar()}<div class="oe-folder-caption"><i class="oe-caption-icon" aria-hidden="true"></i><strong>${escapeHtml(mailFolderCaption())}</strong></div><div class="mail-layout">${mailFolders()}<section class="mail-content">${content}</section></div><div class="oe-statusbar"><span>${emptyMailSearch ? "0 封邮件" : "完成"}</span><span>脱机工作</span></div></div>`;
  };

  const threadView = id => {
    const thread = threads[id];
    if (!thread || !canOpenThread(id)) return inboxRows();
    // 邮件正文只显示随信发送的附件；未发送草稿集中在后段的历史副本里查看。
    const selected=Math.max(0,Math.min(thread.messages.length-1,Number(state.mail.messageIndex)||0));
    const [from,to,date,body,failed,customSubject]=thread.messages[selected];
    const files=mailAttachments[id]?.[selected] || [];
    const rows=thread.messages.map(([sender,receiver,time,,messageFailed,messageSubject],index)=>'<tr class="'+(selected===index?'selected ':'')+((state.mail.readMessages[id]||[]).includes(index)?'':'unread')+'" aria-selected="'+(selected===index)+'" data-action="select-message" data-index="'+index+'"><td class="attachment-marker">'+((mailAttachments[id]?.[index]||[]).length?'<i class="paperclip" aria-label="有附件"></i>':'')+'</td><td>'+escapeHtml(displayParticipant(id,sender))+'</td><td><button class="mail-subject-button">'+escapeHtml(messageSubject||((index?'Re: ':'')+thread.subject))+'</button></td><td>'+time+'</td></tr>').join('');
    const attachment=files.length?'<div class="oe-attachments"><span>附件：</span>'+files.map(file=>'<button class="oe-attachment" data-action="open-mail-attachment" data-thread="'+id+'" data-attachment="'+file.id+'"><i class="attachment-file-icon" aria-hidden="true"></i>'+escapeHtml(file.name)+'</button>').join('')+'</div>':'';
    return '<section class="oe-conversation"><div class="oe-message-list"><table class="mail-list"><thead><tr><th class="attachment-marker" title="附件"><i class="paperclip" aria-hidden="true"></i></th><th>发件人</th><th>主题</th><th>接收时间</th></tr></thead><tbody>'+rows+'</tbody></table></div><article class="message-view oe-preview"><header class="oe-message-header"><div><b>发件人：</b>'+escapeHtml(displayParticipant(id,from))+'</div><div><b>收件人：</b>'+escapeHtml(displayParticipant(id,to))+'</div><div><b>发送时间：</b>'+date+'</div><div><b>主题：</b>'+escapeHtml(customSubject||thread.subject)+'</div>'+attachment+'</header><div class="oe-message-body">'+mailBodyHtml(displayMailBody(id,body))+(failed?'<button class="delivery-link" data-action="open-delivery">投递失败：收件人映射无法恢复</button>':'')+'</div></article></section>';
  };

  const mailAttachmentView = () => {
    const ref = state.mail.attachment;
    if (!ref || !visibleThreadIds().includes(ref.thread)) return inboxRows();
    const file = ref && attachmentFor(ref.thread, ref.id);
    if (!file) return threadView(state.mail.thread);
    if (file.id === "private-backup") return backupView();
    const recovered = accountRecovered(ref.thread);
    const recoveryAction = file.recovery ? (recovered ? `<p><button class="system-button primary" data-action="open-archive-record" data-record="${file.record}">打开原件</button></p>` : `<p><button class="system-button primary" data-action="inspect-local-data">检查此旧路径</button></p><p class="faint">只检查这组本机旧副本；不会联网，也不会读取其他联系人资料。</p>`) : "";
    return `<article class="message-view"><button class="plain-link" data-action="open-thread" data-thread="${ref.thread}">← 返回往来邮件</button><h1>${escapeHtml(file.name)}</h1><p class="faint">附件信息：${escapeHtml(file.source)}</p>${paragraphs(file.recovery && recovered ? "这是这组邮件留下的本机旧副本，只读查看。" : file.body)}${recoveryAction}</article>`;
  };

  const selfNoteView = () => '<section class="oe-conversation oe-draft-view"><div class="oe-message-list oe-local-list"><table class="mail-list">'+mailColumns(true)+'<tbody><tr class="selected" data-action="open-self-note"><td class="mail-state-column"><span class="oe-envelope" aria-hidden="true"></span></td><td><i class="paperclip" aria-hidden="true"></i></td><td>沈知返</td><td><button class="mail-subject-button" type="button">湖畔那扇门</button></td><td>2008/7/19</td></tr></tbody></table></div><article class="message-view oe-preview"><header class="oe-message-header"><div><b>发件人：</b>沈知返</div><div><b>收件人：</b><span class="oe-blank-recipient">（未填写）</span></div><div><b>主题：</b>湖畔那扇门</div><div><b>状态：</b>未发送 · 保存于 2008/7/19</div><div class="oe-attachments"><b>附件：</b><button class="oe-attachment" data-action="open-page" data-page="siren-clipping"><i class="attachment-file-icon" aria-hidden="true"></i>剪报：尸体自己锁上的门.htm</button></div></header><div class="oe-message-body">'+paragraphs("报纸说，是死人自己锁的门。\n\n门撞开以后，我看见了里面。锁门的那一下，我没看见。\n\n我记得展厅里的样子，却想不起自己怎么到了湖畔村。去那里做什么，也想不起来。\n\n再查“塞壬”，查到了安南高速的旧案。转帖说，公司门口的花也是“塞壬”留下的。\n\n“第七天再开窗”在论坛写过申述。她说花不是她放的。\n\n她回过我。先把那封信找出来。")+'</div></article></section>';
  const appointmentReminderView = () => `<article class="message-view"><button class="plain-link" data-action="mail-inbox">← 返回收件箱</button><header class="message-meta"><h1>预约已确认</h1><div><b>发件人：</b>市二院门诊提醒</div><div><b>收件人：</b>沈知返</div></header><div class="thread-item"><p>沈知返：</p><p>您的门诊预约已确认。</p><p>预约日期：2008 年 7 月 4 日<br>接诊医生：程守衡</p><p>请按预约时间到院，并携带既往就诊资料。</p></div></article>`;

  const mail = () => {
    if (!state.mail.loggedIn) return shell("Outlook Express", login());
    let content = inboxRows();
    if (state.mail.view === "thread") content = threadView(state.mail.thread);
    if (state.mail.view === "attachment") content = mailAttachmentView();
    if (state.mail.view === "self-note") content = selfNoteView();
    if (state.mail.view === "appointment-reminder") content = appointmentReminderView();
    if (state.mail.view === "record" && state.backupUnlocked) content = privateRecordView();
    if (state.mail.view === "junk") content = noticeView();
    if (state.mail.view === "search") content = searchRows(state.mail.query);
    if (state.mail.view === "manage") content = manageView();
    if (state.mail.view === "legacy-archive" && archiveAvailable() && archiveEntryAvailable()) content = legacyArchiveView();
    if (state.mail.view === "legacy-account" && archiveAvailable() && archiveEntryAvailable()) content = legacyAccountView();
    if (state.mail.view === "encrypted" && finalGateReady()) content = encryptedMailView();
    if (state.mail.view === "continuity" && continuityReady()) content = continuityView();
    if (state.mail.view === "final" && state.finalUnlocked) content = doctorView();
    if (state.mail.view === "handover" && state.finalUnlocked) content = doctorView();
    // 影片只在医院场景挂载；退出影片后，后台OE不生成第二个播放器。
    if (state.mail.view === "ending" && state.finalUnlocked) content = doctorView();
    return shell("Outlook Express", mailFrame(content));
  };

  const manageView = () => `<section class="detail-panel"><h1>账户信息</h1><table class="details"><tbody><tr><th>沈知返</th><td>shenzhifan@...<br><span style="color:#6f7880">当前账户（脱机）</span></td></tr></tbody></table><p class="faint">这里只有本机账户信息，没有可连接的邮箱服务器。</p></section>`;

  const legacyArchiveView = () => readingView();

  const legacyAccountView = () => {
    const account = legacyAccounts[state.legacy.account];
    if (!account || !archiveEntryAvailable()) return legacyArchiveView();
    const id = state.legacy.account;
    const view = state.legacy.view;
    const selected = Number.isInteger(state.legacy.item) && ["drafts", "files"].includes(view) ? state.legacy.item : null;
    if (selected !== null) {
      const item = archiveRecord(`legacy:${id}:${view}:${selected}`);
      if (!item) return legacyArchiveView();
      const reader = evidenceReader(item);
      const media = reader || (item.image ? `<img class="attachment-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">` : "");
      const body = reader ? "" : paragraphs(item.body);
      const sequence = [ ...account.drafts.map((_, index) => ({kind:"drafts", index})), ...account.files.map((_, index) => ({kind:"files", index})) ];
      const position = sequence.findIndex(entry => entry.kind === view && entry.index === selected);
      const turn = (entry, label) => entry ? `<button class="system-button" data-action="open-legacy-item" data-kind="${entry.kind}" data-index="${entry.index}">${label}</button>` : "";
      return `<article class="message-view"><button class="plain-link" data-action="open-legacy-account" data-account="${id}">← 返回${escapeHtml(accountLabel(id))}</button><header class="message-meta"><h1>${escapeHtml(item.title)}</h1><div>${view === "drafts" ? `收件人：${escapeHtml(item.recipient)} · 未发送` : "本机附件"}</div></header>${media}${body}<footer class="continuity-actions">${turn(sequence[position-1],"上一份")}${turn(sequence[position+1],"下一份")}<button class="plain-link" data-action="open-legacy-account" data-account="${id}">返回本组目录</button></footer></article>`;
    }
    return `<article class="message-view"><button class="plain-link" data-action="open-legacy-archive">← 返回旧邮件副本</button><header class="message-meta"><h1>${escapeHtml(accountLabel(id))}</h1><div>这台电脑留下的草稿和附件</div></header><h2>未发送草稿</h2><ul>${account.drafts.map((draft, index) => `<li><button class="plain-link" data-action="open-legacy-item" data-kind="drafts" data-index="${index}">${escapeHtml(draft[1])}</button></li>`).join("")}</ul><h2>附件</h2><ul>${account.files.map((file, index) => `<li><button class="plain-link" data-action="open-legacy-item" data-kind="files" data-index="${index}">${escapeHtml(file[0])}</button></li>`).join("")}</ul></article>`;
  };

  const encryptedMailView = () => {
    if (!finalGateReady()) return state.backupUnlocked ? readingView() : documentFolderView();
    if (state.finalUnlocked) return doctorView();
    if (continuityReady() && state.nameReview.viewingRecords) return continuityView();
    return '<section class="detail-panel identity-gate"><nav class="reader-toolbar"><button class="plain-link" data-action="reading-review">← 回看刚刚读完的11页原件</button></nav><div class="reader-pages">' + continuityNamesForm() + '</div></section>';
  };


  const endingView = () => window.__endingFilm.view();


  const browserPageTitles = {
    "siren-clipping": "临川旧闻 · 本机保存：尸体自己锁上的门",
    "school-clipping": "闪金村废弃学校命案旧闻",
    "school-followup": "闪金村摄像记录与房间核对",
    "bnb-injury": "湖畔村续报：死者并非死于火灾",
    "bnb-event": "湖畔村雪夜聚会旧帖",
    "bnb-roster": "雪夜笔友聚会报名存根",
    "bnb-power": "湖畔村民宿停电维修登记",
    "bnb-latch": "陶艺展厅旧门照片说明",
    "bnb-method": "尸僵与高温斗拳状资料",
    "bnb-verification": "湖畔村民宿现场推断单",
    "bnb-reconstruction": "民宿案补充记录",
    siren: "“塞壬”旧案：警方仍在征集线索",
    "siren-police": "关于“塞壬”旧案网络传言的说明",
    "siren-forum": "鬼校、民宿、塞壬：这些旧传闻到底有没有联系？",
    annan: "那年高速上的车祸，后来有人知道后续吗？",
    "annan-news": "雨夜车辆失控冲出护栏",
    "annan-letter": "读者来信｜《被省略的人》",
    "annan-statement": "当事人上传：关于安南高速报道的申述",
    shinan: "石楠｜植物百科节选",
    "405": "405 的门锁，谁动过？",
    "405-police": "石榴巷 405：住所疑似被他人进入",
    "405-repair": "石榴巷 405 更换锁芯服务登记",
    yanjiang: "雁江旧员工工资结算底单留存页",
    "yanjiang-news": "雁江会所经营者失联，涉案资产进入清算",
    "yanjiang-forum": "雁江会所关门后，谁拿到了最后一笔工资？",
    zuan: "祖安村外无牌面包车起火，四名失踪人员去向成谜",
    "zuan-missing": "四名失踪人员信息仍待核",
    "zuan-gazetteer": "祖安村地方志摘录：山路与火塘",
    dna: "DNA 身份鉴定：一项刚走进地方刑侦的技术",
    "dna-qna": "为什么有样本，仍不能马上确认身份？",
    photo: "城市青年摄影展存档｜《留下的人》",
    "photo-closure": "公益摄影展“留下的人”闭展记录",
    "photo-guestbook": "《留下的人》看展留言簿",
    zhou: "湖畔村民宿事故后续材料"
  };
  // 镜像密室不再作为玩家可进入的独立谜题；相关叙述只留在后期资料正文中。
  const retiredPuzzlePages = new Set(["school-clipping", "school-followup", "bnb-verification", "bnb-reconstruction"]);

  const currentBrowserRoute = () => ({ page: state.browser.page || null, query: state.browser.query || "" });
  const sameBrowserRoute = (left, right) => left.page === right.page && left.query === right.query;
  const browserRouteTitle = route => route.page ? (browserPageTitles[route.page] || "临川旧页") : route.query ? `搜索：${route.query}` : "临川搜索";
  const browserRouteAddress = route => ["bnb-verification", "bnb-reconstruction"].includes(route.page) ? `本机文件 / 我的文档 / ${browserPageTitles[route.page]}.htm` : route.page ? `http://archive.lin-chuan.cn/${route.page}.html` : route.query ? `http://search.lin-chuan.cn/?wd=${encodeURIComponent(route.query)}` : "http://search.lin-chuan.cn/";

  const rememberBrowserVisit = route => {
    if (!route.page && !route.query) return;
    if(route.page && !state.browser.visitedPages.includes(route.page))state.browser.visitedPages.push(route.page);
    const visit = { page: route.page || null, query: route.query || "", title: browserRouteTitle(route) };
    state.browser.visits = [visit, ...state.browser.visits.filter(item => !sameBrowserRoute(item, visit))].slice(0, 16);
    if (route.query) state.browser.searches = [route.query, ...state.browser.searches.filter(item => item !== route.query)].slice(0, 8);
  };

  const navigateBrowser = route => {
    // 旧存档可能还保留镜像路线的历史地址；升级后不再允许它重新进入玩家流程。
    if (route.page && retiredPuzzlePages.has(route.page)) route = { page: null, query: "" };
    const current = currentBrowserRoute();
    if (!sameBrowserRoute(current, route)) {
      state.browser.backStack = [...state.browser.backStack, current].slice(-32);
      state.browser.forwardStack = [];
    }
    state.currentApp = "browser";
    if (!state.openApps.includes("browser")) state.openApps.push("browser");
    state.browser.page = route.page || null;
    state.browser.query = route.query || "";
    freshBrowserInputs = true;
    state.browser.historyOpen = false;
    rememberBrowserVisit(route);
    if (route.query) recordInvestigation("网页搜索", route.query);
    if (route.page) recordInvestigation(["bnb-verification", "bnb-reconstruction"].includes(route.page) ? "本机文件" : "网页资料", browserPageTitles[route.page] || route.page);
    markCaseClue(caseSources.find(item => item.page === route.page)?.clue);
    save();
    render();
  };

  const browserHistoryMenu = () => {
    if (!state.browser.historyOpen) return "";
    const visits = state.browser.visits;
    if (!visits.length) return `<div class="browser-history-menu empty">还没有浏览记录。</div>`;
    return `<div class="browser-history-menu"><div class="browser-history-heading">今天</div>${visits.map((visit, index) => `<button data-action="browser-open-history" data-index="${index}"><span>${escapeHtml(visit.title)}</span><small>${visit.query ? "搜索结果" : "已查看"}</small></button>`).join("")}</div>`;
  };

  const ieToolbar = (local=false) => {
    const back=local?(state.document==='identity'?'reading-review':state.reading.index?'reading-prev':'local-folder'):'browser-back';
    const forward=local?'reading-next':'browser-forward';
    const canForward=local?state.document==='reading'&&state.reading.index<state.reading.furthest:state.browser.forwardStack.length;
    const canBack=local||state.browser.backStack.length||state.browser.page||state.browser.query;
    return '<div class="ie-toolbar"><button class="browser-nav" data-action="'+back+'" '+(canBack?'':'disabled')+' aria-label="后退"><i class="ie-icon ie-back"></i>后退<small>▾</small></button><button class="browser-nav" data-action="'+forward+'" '+(canForward?'':'disabled')+' aria-label="前进"><i class="ie-icon ie-forward"></i><small>▾</small></button><span class="ie-separator"></span><button class="browser-nav" disabled title="停止"><i class="ie-icon ie-stop"></i></button><button class="browser-nav" data-action="local-refresh" aria-label="刷新"><i class="ie-icon ie-refresh"></i></button><button class="browser-nav" data-action="'+(local?'local-folder':'browser-home')+'" aria-label="主页"><i class="ie-icon ie-home"></i></button><span class="ie-separator"></span><button class="browser-nav ie-search-tool" data-action="browser-home"><i class="ie-icon ie-magnify"></i>搜索</button><button class="browser-nav ie-favorites" disabled><i class="ie-icon ie-star"></i>收藏夹</button><button class="browser-history-button" data-action="browser-toggle-history" '+(local?'disabled':'')+'><i class="ie-icon ie-history"></i>历史</button></div>';
  };
  const browserChrome = () => {
    const route = currentBrowserRoute();
    return `<div class="browser-chrome">${ieToolbar()}<form class="browser-address-form" data-form="browser-address"><label for="ie-address">地址(D)</label><div class="ie-address-field">${xpIcon("browser")}<input id="ie-address" class="browser-address" name="address" aria-label="地址" title="输入网址或搜索词" autocomplete="off" spellcheck="false" value="${escapeHtml(browserRouteAddress(route))}"><span aria-hidden="true">▾</span></div><button class="browser-nav ie-go" type="submit"><i aria-hidden="true">➜</i>转到</button><span class="ie-links" aria-hidden="true">链接 »</span></form><span id="browser-address-error" class="browser-address-error" role="status"></span>${state.browserNotice ? `<span class="browser-address-error" role="status">${escapeHtml(state.browserNotice)}</span>` : ""}${browserHistoryMenu()}</div>`;
  };

  // Only the game's public addresses are navigable. Never fetch an entered URL
  // or use a guessed path to bypass private-document access checks.
  const openBrowserAddress = value => {
    const input = value.trim();
    const error = document.querySelector("#browser-address-error");
    if (error) error.textContent = "";
    if (input === browserRouteAddress(currentBrowserRoute())) return;
    if (!input) { navigateBrowser({ page: null, query: "" }); return; }
    const urlLike = /^(?:[a-z][a-z\d+.-]*:|\/\/|www\.|(?:[a-z\d-]+\.)+[a-z]{2,}(?:[/:?#]|$))/i.test(input);
    if (!urlLike) { navigateBrowser({ page: null, query: input }); return; }
    try {
      const url = new URL(input.startsWith("//") ? "http:" + input : /^[a-z][a-z\d+.-]*:/i.test(input) ? input : "http://" + input);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) throw new Error("Unsupported address");
      if (url.hostname === "search.lin-chuan.cn" && url.pathname === "/") {
        navigateBrowser({ page: null, query: url.searchParams.get("wd") || "" }); return;
      }
      const pageId = url.pathname.match(/^\/([a-z\d-]+)\.html$/)?.[1];
      if (url.hostname === "archive.lin-chuan.cn" && pageId && Object.hasOwn(pageContent, pageId) && !["bnb-verification", "bnb-reconstruction"].includes(pageId) && !retiredPuzzlePages.has(pageId)) {
        navigateBrowser({ page: pageId, query: "" }); return;
      }
    } catch { /* Invalid addresses keep the currently open page intact. */ }
    if (error) error.textContent = "这个地址打不开，当前资料页还在。";
  };

  const searchGroup = query => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    if (q.includes("镜像") || q.includes("鬼校") || q.includes("闪金村") || q.includes("人影") || q.includes("镜面")) return "empty";
    if (q.includes("塞壬")) return "siren";
    if (q.includes("湖畔") || q.includes("民宿") || q.includes("雪夜") || q.includes("陶艺")) return "bnb";
    if (q.includes("斗拳") || q.includes("尸僵") || q.includes("尸体锁门") || q.includes("门闩")) return "bnb-method";
    if (q.includes("安南")) return "annan";
    if (q.includes("石楠")) return "shinan";
    if (q.includes("石榴") || q.includes("405")) return "405";
    if (q.includes("雁江") || q.includes("会所")) return "yanjiang";
    if (q.includes("周济")) return "zhou";
    if (q.includes("祖安") || q.includes("焚车") || q.includes("面包车")) return "zuan";
    if (q.includes("dna") || q.includes("身份鉴定")) return "dna";
    if (q.includes("摄影展") || q.includes("留下的人") || q.includes("山路")) return "photo";
    return "empty";
  };

  const searchWordmark = () => `<div class="search-brand"><b>Lin<span>Chuan</span></b><strong>临川</strong><small>搜 索</small></div>`;
  const searchCategoryBar = () => `<div class="search-categories" aria-label="检索范围"><b aria-current="page">网页</b><span title="本机快照未收录此分类">新闻</span><span title="本机快照未收录此分类">论坛</span><span title="本机快照未收录此分类">知道</span><span title="本机快照未收录此分类">MP3</span><span title="本机快照未收录此分类">图片</span></div>`;
  const browserHome = () => `<section class="browser-layout">${browserChrome()}<section class="search-home search-landing">${searchWordmark()}${searchCategoryBar()}<form data-form="browser-search"><input name="query" aria-label="搜索网页、新闻、地点或姓名" autofocus autocomplete="off" value="${escapeHtml(state.browser.query)}"><button type="submit">搜索一下</button></form><p class="search-directory">地方新闻　|　生活资讯　|　资料查询</p><p class="search-home-footer">临川搜索 · 网页索引<br><small>© 2008 LinChuan</small></p></section></section>`;
  const result = (title, url, summary, page) => `<article class="result"><h2><a href="#" data-action="open-page" data-page="${page}">${title}</a></h2><div class="url">${url}</div><p>${summary}</p></article>`;
  // 索引只读取公开文章，不读工具栏、私人草稿或玩家的推断。
  const publicSearchTerms = {
    yanjiang: ["雁江会所", "工资", "结算", "账还没完"],
    "paper-forum": ["纸页文学", "迟到的读者"],
    "paper-novel": ["尸体", "高温", "受热", "火", "手", "手部", "蜷曲", "横闩", "门闩", "锁门", "未完稿", "迟到的读者", "等屋里暖起来"],
    "bnb-method": ["尸体", "高温", "手部", "蜷曲", "斗拳状", "火灾", "姿势"],
    "bnb-latch": ["湖畔村", "旧门", "门闩", "结构"], "siren-clipping": ["湖畔", "民宿", "塞壬"],
    "annan-news": ["安南高速", "安南车祸", "高速车祸", "交通事故"],
    "photo": ["摄影展", "影展", "留下的人", "摄影图录", "借展", "归还登记"],
    "405": ["石榴巷405", "石榴巷 405", "租住互助", "租房", "入室放花", "桌上多了花", "花束"],
    "zuan": ["祖安", "祖安村", "焚车案", "面包车起火", "焚车照片", "摄影署名", "报纸照片", "车辆起火"],
    "zhou": ["周济川", "死者身份", "身份更正", "档案管理员"],
    "yanjiang-forum": ["雁江会所", "旧员工", "工资", "会计", "账房"],
  };
  const findPublicPages = query => {
    if (!investigation || !String(query).trim()) return [];
    const corpus = Object.entries(pageContent).filter(([id]) => !["bnb-verification", "bnb-reconstruction"].includes(id) && !retiredPuzzlePages.has(id)).map(([id, content]) => {
      const article = content(id === "school-followup" ? "night" : id === "annan" ? "index" : undefined).match(/<article class="old-page[^>]*>([\s\S]*)<\/article>/)?.[1] || "";
      const allClips = id === "school-followup" ? " " + Object.values(schoolClips).map(clip => clip.time + " " + clip.body + " " + clip.note).join(" ") : "";
      return { id, title: browserPageTitles[id] || id, body: investigation.plainText(article) + allClips, terms: publicSearchTerms[id] || [] };
    });
    return investigation.rank(corpus, query);
  };
  const browserResults = query => {
    const matches = findPublicPages(query);
    const entries = matches.map(item => result(escapeHtml(item.title), `archive.lin-chuan.cn/${item.id}.html`, escapeHtml(item.id === "paper-novel" ? "2004.12.20 · 原帖存档（未修订）。一篇关于展厅、火与横闩的未完稿，篇名见原文。" : item.body.slice(0, 130)) + "…", item.id));
    const resultHeading = entries.length ? `<p class="query-line">与“${escapeHtml(query)}”相关的公开资料</p>` : "";
    const resultContent = entries.length ? entries.join("") : `<p class="search-no-results">没有找到与“${escapeHtml(query)}”相关的网页。</p><p class="faint">当前只能查这台电脑保存的公开页面，暂时无法联网搜索。</p>`;
    return `<section class="browser-layout">${browserChrome()}<section class="search-results"><form class="search-home search-results-form" data-form="browser-search">${searchWordmark()}${searchCategoryBar()}<div><input name="query" value="${escapeHtml(query)}" aria-label="搜索网页、新闻、地点或姓名"><button type="submit">搜索</button></div></form>${resultHeading}${resultContent}</section></section>`;
  };

  const siteProfile = pageId => {
    if (pageId.startsWith("paper-")) return {className:"site-forum",brand:"纸页文学",section:"小说 · 随笔 · 写作闲谈",mark:"纸页",kicker:"PAPER LITERATURE",issue:"旧帖原文存档",links:[["作者主页","paper-forum"],["写作闲谈","paper-chat"]],ad:["返回作者主页","paper-forum"],hero:"clipping-paper-v1.png",heroAlt:"写作稿纸"};
    if (["siren", "siren-police", "siren-forum", "siren-clipping", "annan", "annan-news", "annan-letter", "annan-statement"].includes(pageId)) return {
      className: "site-news", brand: "临川旧闻资料库", section: "新闻 · 论坛 · 旧案", mark: "旧闻在线", kicker: "LINCHUAN NEWS NETWORK", issue: "2008年7月　网页快照",
      links: [["旧案汇总", "siren"], ["安南旧闻", "annan"], ["湖畔现场", "siren-clipping"], ["讨论区", "siren-forum"]],
      ad: ["DNA 身份鉴定：一项刚走进地方刑侦的技术", "dna"], hero: "siren-door-latch-hero-v3.png", heroAlt: "湖畔村门缝内侧：焦黑的手仍握着横闩"
    };
    if (["405", "405-police", "405-repair", "yanjiang", "yanjiang-news", "yanjiang-forum"].includes(pageId)) return {
      className: "site-forum", brand: "临川生活互助网", section: "租住 · 员工 · 旧帖", mark: "生活互助", kicker: "LINCHUAN COMMUNITY BBS", issue: "本地生活　旧帖缓存",
      links: [["租住互助", "405"], ["维修记录", "405-repair"], ["员工讨论", "yanjiang-forum"], ["旧案新闻", "yanjiang-news"]],
      ad: ["旧住处维修记录", "405-repair"], hero: "camera-return-v1.png", heroAlt: "旧相机与归还标签"
    };
    if (["photo", "photo-closure", "photo-guestbook", "quake", "zuan", "zuan-missing", "zuan-gazetteer", "dna", "dna-qna"].includes(pageId)) return {
      className: "site-archive", brand: "临川资料与影像", section: "专题 · 扫描 · 保存", mark: "资料室", kicker: "LINCHUAN DOCUMENT ARCHIVE", issue: "扫描件与借展记录",
      links: pageId.startsWith("photo") ? [["影像展存档", "photo"], ["闭展记录", "photo-closure"], ["看展留言", "photo-guestbook"], ["祖安旧报", "zuan"]] : [["影像资料", "zuan"], ["地方资料", "zuan-gazetteer"], ["协查旧档", "zuan-missing"], ["法治问答", "dna-qna"]],
      ad: ["湖畔村民宿案：公开资料汇总", "siren"], hero: "clipping-paper-v1.png", heroAlt: "旧报纸剪报与档案纸张"
    };
    return {
      className: "site-generic", brand: "临川旧网页快照", section: "本机保存页面", mark: "网页快照", kicker: "LINCHUAN WEB SNAPSHOT", issue: "本机保存　只读页面",
      links: [["资料首页", "siren"], ["旧闻论坛", "siren-forum"], ["影像资料", "zuan"]],
      ad: ["返回临川搜索", "__home__"], hero: "enrollment-paper-v1.png", heroAlt: "泛黄的入学材料"
    };
  };
  const siteLink = ([label, id], extra = "") => {
    if (id === "__home__") return `<a href="#" class="${extra}" data-action="browser-home">${label}</a>`;
    if (!Object.hasOwn(pageContent, id)) return `<span class="site-faux-link site-link-unavailable ${extra}" title="本机快照未收录此分类">${label}</span>`;
    return `<a href="#" class="${extra}" data-action="open-page" data-page="${id}">${label}</a>`;
  };
  const siteHeader = profile => {
    const current = state.browser.page || "";
    return `<div class="site-utility"><span>欢迎访问临川本地资料网</span><span>${profile.issue}</span><span>只读存档 · 原站服务未保存</span></div><header class="site-network-header"><div class="site-brand-row"><div class="site-network-brand"><i class="site-logo-mark">${profile.mark}</i><div><b>${profile.brand}</b><span>${profile.kicker}</span></div></div><div class="site-header-tools"><small>站内资料检索</small><div class="site-mini-search">新闻　论坛　图片　<span>搜索</span></div></div></div><div class="site-section-line"><strong>${profile.section}</strong><em>本页为只读网页快照，内容按原页面排版保存</em></div><nav>${profile.links.map(([label, id]) => siteLink([label, id], id === current ? "active" : "")).join("")}</nav><div class="site-network-meta"><span>临川网络　|　地方信息服务</span><span>快照保存：2008.08.01</span></div></header>`;
  };
  const siteRail = profile => '<aside class="site-rail"><section class="rail-module"><h2><span>资料说明</span><small>ARCHIVE</small></h2><div class="site-ad"><small>本地资料存档</small><b>'+profile.brand+'</b><span>本页资料仅供查阅。转载时请注明出处。</span></div></section></aside>';
  const mailAdvertisementPages = new Set(["siren-forum", "annan"]);
  const mailAdvertisement = () => '<section class="mail-ad" role="img" aria-label="邮箱软件广告：邮件通2008。旧邮件太多？按发件人或主题查找。"><small class="mail-ad-disclosure" aria-hidden="true">广告</small><div class="mail-ad-brand" aria-hidden="true">邮件通<span>2008</span></div><div class="mail-ad-subtitle" aria-hidden="true">个人邮件管理软件</div><div class="mail-ad-campaign" aria-hidden="true"><strong class="mail-ad-frame mail-ad-frame-one">旧邮件<br>太多？</strong><strong class="mail-ad-frame mail-ad-frame-two">找一封信<br>翻半天？</strong><strong class="mail-ad-frame mail-ad-frame-three">旧信查找<br>轻松搞定</strong></div><div class="mail-ad-product" aria-hidden="true"><div class="mail-ad-mini-window"><div class="mail-ad-mini-title"><i></i>邮件通 2008<span>− □ ×</span></div><div class="mail-ad-mini-menu">文件　编辑　查看　工具</div><div class="mail-ad-mini-query">查找：<b>发件人 / 主题</b></div><div class="mail-ad-mini-body"><div class="mail-ad-mini-folders"><i></i><i></i><i></i><i></i></div><div class="mail-ad-mini-list"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><div class="mail-ad-box"><span>MAIL</span><b>2008</b><i>邮件通</i></div></div><div class="mail-ad-copy" aria-hidden="true">按发件人<br>或主题查找。</div><div class="mail-ad-platform" aria-hidden="true">Windows 2000 / XP</div></section>';
  const siteRightRail = profile => {
    const duplicate=profile.ad[1]===state.browser.page||profile.links.some(([,id])=>id===profile.ad[1])||profile.bodyLinkIds?.includes(profile.ad[1]);
    return '<aside class="site-right-rail">'+(duplicate?'':'<section class="right-module site-promo"><div class="promo-label">相关资料</div><div class="promo-thumb"><img src="./assets/'+profile.hero+'" alt="'+profile.heroAlt+'" loading="lazy"></div>'+siteLink([browserPageTitles[profile.ad[1]]||profile.ad[0],profile.ad[1]],'promo-link')+'</section>')+(mailAdvertisementPages.has(state.browser.page)?mailAdvertisement():'')+'<section class="right-note">临川网络资料中心<br>旧版页面由本机缓存保存</section></aside>';
  };
  const page = (masthead, title, byline, content, article = true) => {
    const profile = siteProfile(state.browser.page || "");
    // Presentation only: keep source words and links intact for the search index.
    const forum = /论坛|互助版|讨论区|留言簿|旧员工/.test(masthead) && content.includes('class="forum-post"');
    if (forum) {
      profile.className = "site-forum forum-thread-page";
      profile.brand = masthead;
      profile.mark = "BBS";
      profile.kicker = "LINCHUAN COMMUNITY";
      const author = byline?.match(/(?:楼主|发帖人)：([^｜　]+)/)?.[1] || "楼主";
      content = content.replace(/class="forum-body"/g, `class="forum-body" data-author="${escapeHtml(author)}"`);
    }
    profile.bodyLinkIds=[...content.matchAll(/data-page="([^"]+)"/g)].map(m=>m[1]);
    return `<section class="browser-layout site-page ${profile.className}${mailAdvertisementPages.has(state.browser.page) ? " mail-ad-page" : ""}">${browserChrome()}${siteHeader(profile)}<div class="site-breadcrumb">首页　&gt;　${profile.section}　&gt;　${masthead}</div><div class="site-page-grid">${siteRail(profile)}<main class="site-main-column"><div class="site-page-heading"><span>${profile.mark}</span><b>${title}</b><small>LINCHUAN / ARCHIVE</small></div><article class="old-page ${article ? "article" : ""}"><header class="site-masthead">${masthead}</header><h1>${title}</h1>${byline ? `<p class="byline">${byline}</p>` : ""}${content}</article></main>${siteRightRail(profile)}</div><footer class="site-footer"><div><b>${profile.brand}</b>　旧版网页存档</div><small>本页资料由本站存档保存。转载时请注明出处。</small></footer></section>`;
  };
  const schoolClips = {
    night: { time:"4月5日 22:25", title:"从体育馆看过去", body:"六人在体育馆二层。镜头对着教学楼，窗内有悬吊人影；同行者将它称作201。画面中的门扇方向与清晨片段相反。", note:"夜间第一段。画面未见门牌。" },
    dawn: { time:"4月6日 05:50", title:"清晨再次看见", body:"有人叫大家看对面教室，镜头再次拍到悬吊人影。此时画面中的门扇方向，与后来进入201的片段一致。", note:"清晨片段，单独保存。" },
    entry: { time:"4月6日 05:57", title:"进入201", body:"几人在教学楼二层推门，门打不开，随后合力撞开。屋内中央可见悬吊死者。", note:"破门后的室内记录。" }
  };
  const schoolReader = (clipId = state.schoolClip) => {
    const selected = schoolClips[clipId] || schoolClips.night;
    return '<section class="source-reader"><h2>录像片段文字转录</h2><p class="faint">原报道仅附文字摘录，未随页保存影像。门扇方向沿用记录者的描述。</p><div class="source-tabs">' +
      Object.entries(schoolClips).map(([id,clip]) => '<button class="system-button" aria-pressed="' + (clip === selected) + '" data-action="school-clip" data-clip="' + id + '">' + clip.time + '</button>').join("") +
      '</div>' + schoolDirectionView(clipId) + '<div class="source-pair"><article><h3>' + selected.title + '</h3><p>' + selected.body + '</p><p class="faint">' + selected.note + '</p></article><article><h3>第一次进入后的记录</h3><p>夜间看见人影后，六人赶往教学楼201，房内却没有人。之后回到体育馆集中等待。</p><p>最初报道把“看见人影”与“认定201”连写成了一句话。</p></article></div><details><summary>▶ 点击展开／收起：查阅后续更正</summary>' +
      paragraphs("方位复核认为，第一次所见涉及202及镜面映像，不能作为死者当时就在201的证明；清晨进入201所见，是另一时刻的现场。\n\n悬吊死者先于后来进入者死亡；进入者的死亡涉及现场有害物质，而非所谓诅咒。公开摘录未给出完整现场图，也不能凭此识别布置者。") + '</details></section>';
  };
  const schoolDirectionView = clipId => {
    const diagram = (id, label) => `<figure><div class="door-direction asset-photo"><img src="./assets/school-${id === 'night' ? 'night' : 'dawn'}-reconstruction-v1.png" alt="门扇局部复原：${id === 'night' ? '门扇方向与进入片段相反' : '门扇方向与进入片段一致'}" loading="lazy"></div><figcaption>${label} · 门扇局部复原</figcaption></figure>`;
    return '<section class="direction-reader"><p class="faint">门扇方向对照示意：只表达记录中的相反／一致关系，左右放置为排版，不代表建筑实际朝向。</p><div class="source-tabs"><button class="system-button" data-action="school-view" data-view="position" aria-pressed="' + (state.schoolView !== 'compare') + '">当前观察</button><button class="system-button" data-action="school-view" data-view="compare" aria-pressed="' + (state.schoolView === 'compare') + '">与进入片段并排</button></div><div class="crop-pair">' + diagram(clipId, schoolClips[clipId]?.title || schoolClips.night.title) + (state.schoolView === 'compare' && clipId !== 'entry' ? diagram('entry','05:57 · 实际进入201') : '') + '</div></section>';
  };
  const pageContent = {
    "siren-clipping": () => page("临川旧闻 · 本机保存", "尸体自己锁上的门。", `案发：<strong>${caseChronology.bnb.occurredOn}</strong> / 湖畔村民宿陶艺展厅｜剪报日期缺失`, `<figure class="archive-photo paper-clipping"><img src="./assets/siren-door-latch-hero-v3.png" alt="火场门口局部：旧木门微开，只露出内侧横闩和门把手，一只焦黑、手指蜷曲的手仍握着横闩"><figcaption>本机保存的火场门口照片（局部）。原始说明已被水渍毁坏。</figcaption></figure>${paragraphs("雪夜停电后，展厅起火。门被撞开时，死者已经烧得辨不出脸。\n\n右手还搭在门闩上。\n\n横闩仍插在内侧锁扣里。\n\n案后，一条署名“塞壬”的留言开始在转帖中流传。")}<p class="related-page">同案归档：<a href="#" data-action="open-page" data-page="zhou">死者身份更正</a>　<a href="#" data-action="open-page" data-page="siren">“塞壬”旧案汇总</a></p>`),
    "school-clipping": () => page("临川旧闻资料库", "闪金村废弃学校发生命案", "2005年4月｜旧报节选，刊载日缺失", `${paragraphs("4月5日，警方收到一封署名“塞壬”的来信，内容指向闪金村废弃学校的探访活动。次日清晨，现场发现七名死者，其中包括学生和一名警务人员。\n\n早期转述称，对面楼内曾两次出现悬吊人影。相关目击位置和房间号在后续调查中受到质疑。\n\n案发建筑早已停用，所谓“鬼校”是当地旧称。现有公开材料没有显示遇害学生与雁江会所有往来。") }<p class="faint">档案事件标注：来信 ${caseChronology.school.noticeOn}；发现现场 ${caseChronology.school.discoveredOn}。以上日期并非网页转载时间。</p><p class="related-page"><a href="#" data-action="open-page" data-page="school-followup">后续更正：从对面看见的是哪一间房</a>　<a href="#" data-action="open-page" data-page="siren">“塞壬”旧案汇总</a></p>`),
    "school-followup": clipId => page("临川旧闻资料库", "闪金村：两次看见的是同一间房吗？", "摄像记录摘录与调查续报｜刊载日未保留", schoolReader(clipId)),
    "bnb-event": () => page("湖畔村旧论坛缓存", "下雪也成行吗？", "楼主：把冬天装进信封｜活动前留言", `<section class="forum-post"><div class="forum-body">${paragraphs("十个人的房订好了。写信这么久，这回总算能见到人。\n\n民宿说晚上能借陶艺展厅。下雪山路不好走，到不了的提前告诉我，别让大家等。")}</div><div class="forum-reply"><div class="author">邮戳缺一角</div><p>订房确认发一下。我只记了到村口的车，别到时候找错。</p></div><div class="forum-reply"><div class="author">把冬天装进信封（楼主）</div><p>贴在附件里了。名单只在大家的信里留着，不往外发。</p></div><div class="forum-reply"><div class="author">山下小店</div><p>我是店里值班的。展厅门的旧闩有点松，进出时留意，别拿它挂东西。</p></div></section><p class="related-page">活动附件：<a href="#" data-action="open-page" data-page="bnb-roster">订房确认节录</a></p>`),
    "bnb-roster": () => page("湖畔村旧论坛附件", "雪夜笔友聚会报名存根", `活动日期：${caseChronology.bnb.occurredOn}｜打印日期未保留`, paragraphs(caseMaterials.booking)),
    "bnb-power": () => page("湖畔村民宿服务档", "冬季临时停电维修登记", `故障日期：${caseChronology.bnb.occurredOn}｜柜台留存复印件，复印日期未保留`, `${paragraphs("22:40，山路供电不稳，主楼与展厅照明同时熄灭。\n\n23:06，柜台恢复主楼照明；陶艺展厅仍需人工复位。\n\n备注：展厅旧门横闩松动，使用时请确认横闩已经插入锁扣。")}`),
    "bnb-injury": () => page("临川旧闻资料库", "湖畔村续报：死者并非死于火灾", "后续检验报道节录｜刊载日未保留", `${paragraphs(caseMaterials.injury)}<p class="related-page"><a href="#" data-action="open-page" data-page="zhou">死者身份更正</a>　<a href="#" data-action="open-page" data-page="siren-clipping">现场旧剪报</a></p>`),
    "bnb-latch": () => page("湖畔村改造前照片说明", "陶艺展厅旧门", "资料来源：民宿改造相册", `<figure class="siren-door-photo" aria-label="褪色照片中的木门与普通水平滑动横闩"><span class="door-scorch" style="opacity:.25"></span><span class="door-crossbar"></span><figcaption>横闩拔出时门可打开，插入门框锁扣时门锁上。</figcaption></figure><figure class="archive-photo latch-diagram"><img src="./assets/door-latch-diagram-v1.png" alt="普通内侧水平滑动横闩结构示意：拔出与插入锁扣的对照" loading="lazy"><figcaption>旧门闩结构示意。图中只说明同一根横闩水平滑入或拔出锁扣，不推断谁动过它。</figcaption></figure>${paragraphs("展厅旧门未更换锁体。横闩阻力低，拔出时门可推开；沿水平方向插入门框锁扣后，门才算从内侧锁上。")}`),
    "bnb-method": () => page("临川法医资料摘录", "高温与手部斗拳状", "旧资料｜仅供现场判断参考", paragraphs("高温可使尸体呈拳握或屈曲姿态，常称为“斗拳状”。它本身不能说明死者生前是否抓握过物件。\n\n死亡先后、身体与物件的接触、现场结构必须分别核对；不能只凭这个名词复原整个现场。")),
    zhou: () => page("临川旧闻资料库", "湖畔村民宿事故后续材料", "更正刊载：2005.02｜公开更正节选", `${paragraphs(caseMaterials.zhou)}<p class="related-page"><a href="#" data-action="open-page" data-page="bnb-injury">同案续报：火灾之前发生了什么</a></p>`),
     annan: () => page("安南旧事论坛", "那年高速上的车祸，后来有人知道后续吗？", "楼主：旧报纸不包鱼｜发表于很久以前", `<section class="forum-post"><div class="forum-body">${paragraphs("翻箱子翻出一张旧报。就是安南高速那起事。\n\n报纸上只写了两个人没了。可我记得那家公司门口后来总有人放花，保安赶了好多次。那时候大家都说是死者家里人不甘心。\n\n现在想想，也可能只是我记错了。")}</div><div class="forum-reply"><div class="author">路过别淋雨</div><p>那段路以前一下雨就出事，别什么都往人身上安。</p></div><div class="forum-reply"><div class="author">纸箱成精了</div><p>我爸在那附近修车，说过车里两个人感情好得很。现在旧闻搬来搬去又要写成什么爱恨情仇。</p></div><div class="forum-reply"><div class="author">第七天再开窗</div><p>先分三件事。花不是我放的；申述只更正和我有关的说法；车祸现场我没有看见。请不要拿我的署名替花解释。</p><p>附件：<a href="#" data-action="open-page" data-page="annan-statement">关于安南高速报道的申述</a></p></div><div class="forum-reply"><div class="author">别替人收尾</div><p>车里两个人死了。那篇报道里被传照片的人就不算人了吗。她还活着。别替她把话说完。</p></div><div class="forum-reply"><div class="author">阿岚今天也没带伞</div><p>……楼上知道什么就说清楚，别只会写这种话。</p></div><div class="forum-reply"><div class="author">旧报纸不包鱼（楼主）</div><p>都多少年前的事了，散了吧。评论关了。</p></div></section><p class="related-page">楼主补充：<a href="#" data-action="open-page" data-page="annan-letter">《临川晚报》转存的读者来信《被省略的人》</a></p>`),
    "annan-statement": () => page("安南旧事论坛 · 附件", "关于安南高速报道的申述", "上传者：第七天再开窗｜仅转存当事人公开的文字", paragraphs(caseMaterials.statement) + '<p class="related-page"><a href="#" data-action="open-page" data-page="annan">返回原讨论帖</a></p>'),
    "annan-letter": () => page("《临川晚报》旧报转存", "被省略的人", "读者来信｜署名：别替人收尾", `${paragraphs("她的照片被传过 也被塞进宿舍\n你们写事故 只写车里的两个人\n她还活着 却被写成已经原谅了所有人\n\n我没看见车祸 也不知道花是谁放的\n所以别替她收尾") }<p class="related-page">编者附：<a href="#" data-action="open-page" data-page="annan-statement">来信所引的当事人申述</a></p>`),
    shinan: () => page("植物百科节选", "石楠", "植物资料｜民间用法", `${paragraphs("石楠常被用于庭院绿化。民间花语版本不一，其中流传较广的一种释义是：背叛。\n\n注：花语并无统一标准，地区与花店用法可能不同。")}`),
     "405": () => page("石榴巷租住互助版", "405 的门锁，谁动过？", "发帖人：门缝里有灰｜原帖回复：11 · 页面仅节录", `<section class="forum-post"><div class="forum-body">${paragraphs("想问一下……旧门从里面反锁，外面还能打开吗？\n\n我下午回家，桌上多了一束花。门没坏，窗也关着。\n\n花不是给我的。要是我记错了，对不起。")}</div><div class="forum-reply"><div class="author">租房避雷小组</div><p>先换锁，别纠结。房东和中介都有钥匙的概率比较大。</p></div><div class="forum-reply"><div class="author">白天不懂夜的黑</div><p>也可能是前租客留下的？别自己吓自己。</p></div><div class="forum-reply"><div class="author">门缝里有灰（楼主）</div><p>不是前租客……花还是新鲜的。</p></div><div class="forum-reply"><div class="author">二手风扇转得快</div><p>报警吧。有没有丢东西？</p></div><div class="forum-reply"><div class="author">门缝里有灰（楼主）</div><p>没丢。警察说门没被撬。<br>他们问我是不是太累了……我说，可能。</p></div><div class="forum-reply"><div class="author">隔壁住过的人</div><p>先换锁吧。是不是有人进来，网上没人能替你判断。</p></div><div class="forum-reply"><div class="author">门缝里有灰（楼主）</div><p>好……我明天搬。</p></div></section><p class="related-page">相关页面：<a href="#" data-action="open-page" data-page="405-police">楼主上传的回执摘录</a></p>`),
    "405-police": () => page("石榴巷租住互助版 · 附件", "石榴巷 405：住所疑似被他人进入", "上传者：门缝里有灰｜回执摘录，个人信息与日期未保留", `${paragraphs(caseMaterials.receipt)}<p class="faint">网名属于上传者，不是警方登记的报案人姓名。</p>`),
    yanjiang: () => page("雁江旧员工互助版", "工资结算底单留存页", "旧帖附件｜非官方清算公告", `${paragraphs("原负责人失联后，员工自行汇集欠薪底单。下列署名是整理人留下的网络联络名，不是法院或清算机构指定的经办人。") }<table class="work-table"><tbody><tr><th>底单整理署名</th><td>账还没完</td></tr><tr><th>留存范围</th><td>已登记工资及补领凭条；不处理私人债务。</td></tr></tbody></table><p class="related-page"><a href="#" data-action="open-page" data-page="yanjiang-forum">返回员工讨论</a></p>`),
      zuan: () => page("《西岸晨报》地方版", "祖安村外无牌面包车起火，四名失踪人员去向成谜", "2003年末旧报，具体刊日缺失｜配图为后续网页补档，补图日期未留", `${paragraphs("昨夜，祖安村外一辆无牌面包车起火。消防人员到场时火势已得到控制，车内未发现完整遗体。\n\n警方称，车内发现多处可疑生物痕迹；由于当时身份比对条件有限，暂未能确认全部来源。\n\n据附近村民称，起火前曾有数人进入村内，之后未再出现。四名与雁江会所旧案有关联的人员，此后被家属报失踪。\n\n目前案件未破，旧案材料已并入待核档案。")}<figure class="newspaper-photo-credit"><figcaption><p>图：火灭后，烧毁车辆的后侧窗框。</p><p class="photographer-credit">摄影：<strong>原片不外借</strong></p><p>报社刊用的是裁切版，原片由拍摄者保留。配图为后续补档，拍摄日期未记。</p></figcaption></figure><section class="forum-post"><div class="forum-reply"><div class="author">原片不外借</div><p>先别放大那张图。报纸用的是裁切版，黑影不能当人，更不能当证据。</p></div><div class="forum-reply"><div class="author">旧闻爱好者</div><p>那你倒说说原片在哪？</p></div><div class="forum-reply"><div class="author">原片不外借</div><p>原片不公开。要讨论，先看图注、机位和时间戳。</p></div></section>`),
    dna: () => page("《法治周刊》扫描档", "DNA 身份鉴定：一项刚走进地方刑侦的技术", "旧报专题", `${paragraphs("技术能回答“样本是否相同”，却不能自动回答“样本属于谁”。\n\n当一个人从未被采样、资料又彼此断裂时，答案仍会停在档案室里。")}`),
     photo: () => page("城市青年摄影展存档", "《留下的人》", "图录作者：归还处没人", `${paragraphs("本次展览收录借展摄影与物品照片。摄影者与整理者分别署名，器材及照片在闭展后按清单归还。页面只记录物品状态，不替照片补写故事。")}<table class="work-table"><thead><tr><th>作品名</th><th>作品说明</th></tr></thead><tbody><tr><td>《山路》</td><td>山雾里一段没有护栏的旧路。说明文字：母亲走过的路，取景地未附。</td></tr><tr><td>《无题（工具箱）》</td><td>相机器材箱的磨损边角。登记来源：借展器材；并非火场采集物。</td></tr><tr><td>《归还》</td><td>被擦干净的一只旧相机。镜头盖另装，归还状态单独登记。</td></tr></tbody></table><section class="forum-post"><div class="forum-reply"><div class="author">归还处没人</div><p>登记一下：相机擦过了，物主没来取，袋子还在。别扔。</p></div><div class="forum-reply"><div class="author">看展不说话</div><p>这句话写得有点吓人。</p></div><div class="forum-reply"><div class="author">归还处没人</div><p>先看清单。吓不吓人不归我管，未归还就是未归还。</p></div></section>`),
    quake: () => page("灾区影像志", "公益摄影展“留下的人”闭展记录", "影像资料归档", `${paragraphs("展览没有拍废墟最像废墟的时候。\n\n它拍的是天亮以后：被晾在栏杆上的衣服、没人取走的水杯、重新摆正的椅子。")}<blockquote>我不相信遗忘会自动带来原谅。<br>但有些东西被人看见以后，至少不必再假装从没发生过。</blockquote><table class="work-table"><thead><tr><th>作品</th><th>作品说明</th></tr></thead><tbody><tr><td>《天亮以后》</td><td>一张被摆正的空椅子。</td></tr><tr><td>《山路》</td><td>与摄影展存档同一张山路照片。</td></tr><tr><td>《未寄出》</td><td>一叠被退回的信封，只见最上方收件人首字母 C。</td></tr></tbody></table>`)
  };

  // 搜索卡片只给出摘要；实名只在点开的、确实需要署名的原始材料里出现。
  // 这里覆写早期单页草稿，保留每个主词的多份独立材料。
  Object.assign(pageContent, {
    siren: () => page("临川旧闻资料库", "“塞壬”案件旧闻汇总", "资料整理｜公开归档", `${paragraphs("“塞壬”见于匿名材料及预告来信，后来被媒体用来并称数起旧案。警方未确认这一称呼对应单一嫌疑人，也未公布完整案卷。")}<div class="archive-notice"><strong>民宿案简报</strong><br>${caseChronology.bnb.period}，湖畔村民宿陶艺展厅发生火灾。破门时内侧横闩仍插在门框锁扣里，死者右手呈异常蜷曲状态；公开材料未确认是否存在外来者。<br><br><strong>系列旧闻</strong><br>后续数起案件被媒体并入“塞壬”传言。网络流传的“诅咒房间”等说法均未经证实。</div>${paragraphs("如持有原始照片、未归档记录或当事人材料，请依程序提交核验。")}`),
    "siren-police": () => page("临川市公安局公开栏", "关于“塞壬”旧案网络传言的说明", "历史通报｜节选", `${paragraphs("有关旧案的网络整理材料常将不同现场拼作同一套“超自然手法”。现有公开资料不足以支持该结论。\n\n请勿将转帖中的姓名、推测或现场故事视为正式案情；如掌握原始物证或当事人材料，请依程序提交核验。")}`),
    "siren-forum": () => page("临川旧闻讨论区", "湖畔村民宿案和塞壬到底有没有关系？", "楼主：资料夹压泡面｜原帖回复：26 · 页面仅节录", `<section class="forum-post"><div class="forum-body">${paragraphs("旧闻里最怪的是：展厅门从里面锁着，死者的手还压着门闩。有人说是鬼，有人说她自己锁的。")}</div><div class="forum-reply"><div class="author">别把门当鬼</div><p>旧门锁、死亡时间、现场火势，哪个都可能被说错。别先给人编鬼故事。</p></div><div class="forum-reply"><div class="author">错别字收藏家</div><p>可越是解释不通，大家越爱传。</p></div><div class="forum-reply"><div class="author">资料夹压泡面（楼主）</div><p>行，我把那年论坛帖和维修单都存了，等有正式材料再说。</p></div></section>`),
    "annan-news": () => page("《安南晚报》电子剪报", "雨夜车辆失控冲出护栏，贸易公司负责人及未婚妻身亡", "1994年上半年旧报，具体刊日缺失｜安南高速北段", `${paragraphs("昨夜降雨期间，一辆小型轿车在安南高速北段冲出护栏。车内两人经抢救无效死亡。\n\n初步记录显示，车辆在入弯前出现制动异常；后续认定及善后由有关部门处理。本报将持续关注。")}`),
    "shinan-greening": () => page("临川园林维护旧档", "办公区绿化补栽记录", "养护记录｜节选", `${paragraphs("常绿灌木补栽：石楠。\n\n本页为普通养护清单，所列地点、数量与供应信息均已在公开版中脱敏。")}`),
    "405-repair": () => page("临川家修服务档案", "石榴巷 405 更换锁芯服务登记", "维修单｜已归档", `${paragraphs("报修事项：旧锁芯卡滞，更换入户门锁芯。\n\n拆检备注：锁芯磨损明显，但未见撬压变形；门框、窗扣无损。更换后由租住人签收。\n\n本单只记录维修状态，不对住户此前反映的情况作出判断。")}`),
    yanjiang: () => page("雁江旧员工互助版", "工资结算底单留存页", "旧帖附件｜非官方清算公告", `${paragraphs("原负责人失联后，员工自行汇集欠薪底单。下列署名是整理人留下的网络联络名，不是法院或清算机构指定的经办人。")}<table class="work-table"><tbody><tr><th>底单整理署名</th><td>账还没完</td></tr><tr><th>留存范围</th><td>已登记工资及补领凭条；不处理私人债务。</td></tr></tbody></table><p class="related-page"><a href="#" data-action="open-page" data-page="yanjiang-forum">返回员工讨论</a></p>`),
    "yanjiang-news": () => page("临川本地新闻归档", "雁江会所经营者失联，涉案资产进入清算", "旧案资料｜节选", `${paragraphs("雁江会所原经营负责人失联后，部分登记债务、员工结算及留存物品进入临时核验。\n\n公开材料未披露负责人去向；涉及私人纠纷的传言未获证实。")}`),
     "yanjiang-forum": () => page("临川旧员工互助版", "雁江会所关门后，谁拿到了最后一笔工资？", "楼主：关门灯还亮着｜原帖回复：9 · 页面仅节录", `<section class="forum-post"><div class="forum-body">${paragraphs("我只想问结算表还有没有人留着。不是想问老板去哪了，欠我们的那部分有没有着落？")}</div><div class="forum-reply"><div class="author">账还没完</div><p>有登记的，拿单子来，按底单一笔一笔结。没登记的，先别报人名，账会越对越乱。</p><div class="forum-attachments"><span>附件：</span><a class="forum-attachment" href="http://archive.lin-chuan.cn/yanjiang.html" data-action="open-page" data-page="yanjiang"><i class="attachment-file-icon" aria-hidden="true"></i>工资结算底单.htm</a></div></div><div class="forum-reply"><div class="author">关门灯还亮着（楼主）</div><p>那你是谁？</p></div><div class="forum-reply"><div class="author">账还没完</div><p>管过账的人。老板去哪我不清楚。我只认签字、日期和欠下的那一笔。</p></div></section>`)
  });

  Object.assign(pageContent, {
    zuan: () => page("《西岸晨报》地方版", "祖安村外无牌面包车起火，四名失踪人员去向成谜", "2003年末旧报，具体刊日缺失｜配图为后续网页补档，补图日期未留", `${paragraphs("昨夜，祖安村外一辆无牌面包车起火。消防赶到时火势已经控制，车内没有发现完整遗体。\n\n警方说，车里有多处可疑生物痕迹；受当时比对条件限制，暂时还不能确认这些痕迹来自谁。\n\n附近村民称，起火前有人进过村，后来没有再出来。四名与雁江会所旧案有关的人，此后被家属报失踪。\n\n案件仍未侦破，旧材料先并入待核档案。")}<figure class="newspaper-photo-credit"><figcaption><p>图：火灭后，烧毁车辆的后侧窗框。</p><p class="photographer-credit">摄影：<strong>原片不外借</strong></p><p>报社刊用的是裁切版，原片由拍摄者保留。配图为后续补档，拍摄日期未记。</p></figcaption></figure>`),
    "zuan-missing": () => page("临川市公安局协查旧档", "四名失踪人员信息仍待核", "历史协查｜公开摘录", `${paragraphs("四名成年人于同日失联，最后活动区域涉及祖安村外山道。家属曾多次补充寻找线索。\n\n旧档未完成身份核验，相关家属联系方式已按规定隐去。")}`),
    "zuan-gazetteer": () => page("《祖安村地方志》摘录", "山路与火塘", "乡镇资料整理", `${paragraphs("祖安村旧道多岔口，雨后不宜通行。村中火塘原用于祭祖、烘物与冬季取暖。\n\n条目记载：外来人常把村道叫作“绕回来的路”，村民只说那是没修完的旧路。")}`),
    dna: () => page("《法治周刊》扫描档", "DNA 身份鉴定：一项刚走进地方刑侦的技术", "旧报专题", `${paragraphs("DNA可以告诉我们两个样本是不是来自同一人，却不能凭空告诉我们这个人是谁。\n\n如果本人没有留下可比对的样本，或者资料彼此断开，答案仍只能停在档案室里。")}`),
    "dna-qna": () => page("临川法治问答", "为什么有样本，仍不能马上确认身份？", "资料问答｜旧版", `${paragraphs("样本比对要有可参照的数据库、质量稳定的样本，还要经过合法的核验流程。\n\n“未能确认”不等于“什么都没留下”，只是现有材料还不能把答案稳妥地落到某个人身上。")}`),
    photo: () => page("城市青年摄影展存档", "《留下的人》", "图录整理：归还处没人｜借展摄影署名：原片不外借", `${paragraphs("有些照片拍完以后，一直没有给别人看过。这次我们把它们和几件借来的旧物放在一起，做了这个小展。\n\n展览已经结束，作品介绍留在这里。借展物的领取与归还，请与图录整理人联系。") }<figure class="archive-photo"><img src="./assets/camera-return-v1.png" alt="《归还》：擦净的旧相机，镜头盖另放在小袋中" loading="lazy"><figcaption>《归还》 · 镜头盖另装了袋。</figcaption></figure><table class="work-table"><thead><tr><th>作品名</th><th>作品说明</th></tr></thead><tbody><tr><td>《山路》</td><td>山雾里一段没有护栏的旧路。附言：母亲走了很多年的路。</td></tr><tr><td>《无题（工具箱）》</td><td>磨损的箱角和搭扣。借展物品局部。</td></tr><tr><td>《归还》</td><td>擦干净的一只旧相机。说明文字：镜头盖另装了袋，来取时别落下。</td></tr></tbody></table>`),
    "photo-closure": () => page("影像资料保存页", "公益摄影展“留下的人”闭展记录", "场务归档", `${paragraphs("展览结束后，借展物按清单归还，或者由委托人继续保管。\n\n展览没有只拍废墟最惨的那一刻。它还拍了天亮以后：晾在栏杆上的衣服、没人取走的水杯、重新摆正的椅子。")}<blockquote>我不相信忘掉一件事，就会自动原谅它。<br>但有些东西被人看见以后，至少不用再假装从没发生过。</blockquote>`),
    "photo-guestbook": () => page("《留下的人》看展留言簿", "被归还的东西，到底回到哪里？", "匿名留言｜存档", `<section class="forum-post"><div class="forum-reply"><div class="author">归还处没人</div><p>清单上写着：已擦，未归还，镜头盖另装。东西先收好，等物主来认领。</p></div><div class="forum-reply"><div class="author">看展不说话</div><p>这句话写得有点吓人。</p></div><div class="forum-reply"><div class="author">归还处没人</div><p>东西不会害怕。找不到东西的人会，所以我把每一项都记下来。</p></div></section>`)
  });

  // 公开网页只提供传闻与待核材料；民宿案的指向须由玩家在本机通信与现场资料之间自行完成。
  Object.assign(pageContent, {
    siren: () => page("临川旧闻资料库", "“塞壬”旧案汇总", "资料整理｜公开归档", `${paragraphs("“塞壬”这个名字先出现在匿名留言和警方收到的预告信里。后来，网络把几起旧案都挂到这个名字下面；警方没有确认这是同一个人，也没有公开完整案卷。\n\n湖畔村民宿案一直被转发，是因为它留下了一个看起来不可能的画面：火灭之后，尸体的手还在内侧横闩旁，门却已经锁住。") }<section class="archive-notice"><p><strong>${caseChronology.bnb.period} · 湖畔村</strong><br>民宿陶艺展厅起火，一人死亡。发现时内侧横闩仍插在门框锁扣里。<br><a href="#" data-action="open-page" data-page="siren-clipping">查看保存的剪报</a></p><p><strong>${caseChronology.school.period} · 闪金村</strong><br>警方收到署名“塞壬”的来信；次日，废弃学校内发现死者。<br><a href="#" data-action="open-page" data-page="school-clipping">查看学校命案旧闻</a></p></section><section class="archive-notice"><h2>被转帖混入的其他旧事</h2><p>安南高速的一起车祸也被放进部分“塞壬”整理帖。转帖把事故后的花束说成报复暗号；当事人后来发过申述，否认花是自己送的。这些争论不能代替并案依据。</p><p><a href="#" data-action="open-page" data-page="annan">原讨论：安南高速旧闻与当事人申述</a></p></section><div class="archive-notice"><strong>公开材料的边界</strong><br>网络上的“诅咒房间”“连环手法”等说法都没有证实。不能只凭转帖里的称呼，就认定几起案件出自同一人。</div>${paragraphs("如持有原始照片、未归档记录或当事人材料，请依程序提交核验。")}`),
    "siren-police": () => page("临川市公安局公开栏", "关于“塞壬”旧案网络传言的说明", "历史通报｜节选", `${paragraphs("网络整理常把不同现场拼成一套“超自然手法”，但现有公开材料并不能支持这个说法。\n\n转帖里的姓名、推测和现场故事都不是正式案情。如持有原始物证或当事人材料，请依程序提交核验。")}`),
    "siren-forum": () => page("临川旧闻讨论区", "湖畔村民宿案和塞壬到底有没有关系？", "楼主：资料夹压泡面｜原帖回复：26 · 页面仅节录", `<section class="forum-post"><div class="forum-body">${paragraphs("门闩在里面，死人那只手也在里面。我看的转帖说，他死以后又坐起来，把门锁了才躺回去。我知道听着扯，可你们给个没鬼的解释？")}</div><div class="forum-reply"><div class="author">别把门当鬼</div><p>我猜就是用线。从门缝把闩拉上，再把线抽走。非得让死人起来干这活？</p></div><div class="forum-reply"><div class="author">错别字收藏家</div><p>你先说线穿哪，往哪拉。楼主让死人起床，你给凶手发线，都挺省事。</p></div><div class="forum-reply"><div class="author">资料夹压泡面（楼主）</div><p>线那个版本我也看过。手又怎么回事，为什么还在门闩旁？越看越不敢住那种老房子。先下了，明天看你们有没有吵明白。</p></div></section>`)
    });

  // 第一阶段只收束湖畔村的“尸体如何锁门”。闪金村的镜像误读保留在后期资料叙述里，
  // 不再作为公开搜索结果或独立谜题出现。
  pageContent.siren = () => page("临川旧闻资料库", "湖畔村民宿案旧闻", "资料整理｜公开归档", `${paragraphs("“塞壬”这个名字先出现在匿名材料和预告来信里。网络后来把几起旧案混在一起，但现有公开材料没有确认它们属于同一个人。\n\n湖畔村民宿案留下的疑问很具体：火灭之后，死者的手还在内侧横闩旁，门却已经锁住。") }<section class="archive-notice"><strong>${caseChronology.bnb.period} · 湖畔村</strong><br>民宿陶艺展厅起火，一人死亡。发现时内侧横闩仍插在门框锁扣里。<br><a href="#" data-action="open-page" data-page="siren-clipping">查看保存的剪报</a></section><section class="archive-notice"><h2>其他旧闻</h2><p>安南高速的车祸也被转帖混入“塞壬”整理帖。花束和申述各有当事人的说法，不能替代并案依据。</p><p><a href="#" data-action="open-page" data-page="annan">查看安南旧闻与当事人申述</a></p></section><p class="publication-note">编辑附记：本站保留旧帖和后续更正。转载旧报道时，请一并保留更正链接。</p>`);

  // Visual-only attachments: establish the period and source format without adding new
  // clues or changing the public-page text used by search and investigation logic.
  const sirenPageWithReportPhoto = pageContent.siren;
  const zuanPageWithReportPhoto = pageContent.zuan;
  const bnbForumPageWithBouquet = pageContent["405"];
  pageContent.siren = () => sirenPageWithReportPhoto().replace('</article>', '<figure class="archive-photo report-photo"><img src="./assets/bnb-fire-hall-after-v1.png" alt="火灾后的陶艺展厅，湿地面、烟熏墙面与陶艺架" loading="lazy"><figcaption>火灾后的陶艺展厅。</figcaption></figure></article>');
  pageContent.zuan = () => zuanPageWithReportPhoto().replace('<figure class="newspaper-photo-credit"><figcaption><p>图：火灭后，烧毁车辆的后侧窗框。</p><p class="photographer-credit">摄影：<strong>原片不外借</strong></p><p>报社刊用的是裁切版，原片由拍摄者保留。配图为后续补档，拍摄日期未记。</p></figcaption></figure>', '<figure class="archive-photo report-photo"><img src="./assets/zuan-charred-van-v1.png" alt="山道旁烧毁的无牌面包车，地方报纸配图" loading="lazy"><figcaption><span class="photo-credit photographer-credit">摄影：<strong>原片不外借</strong></span><span>火灭后，烧毁车辆的后侧窗框。报社刊用图。</span></figcaption></figure><p class="publication-note">图片经裁切刊用，原片由拍摄者自行保留。配图为后续补档，拍摄日期未记。</p>');
  pageContent["405"] = () => bnbForumPageWithBouquet().replace('<section class="forum-post">', '<figure class="archive-photo attachment-photo"><img src="./assets/flower-desk-detail-v1.png" alt="旧出租屋桌上的白色花束、钥匙和空白便签" loading="lazy"><figcaption>楼主上传：回家时桌上的花。</figcaption></figure><section class="forum-post">');

  if (investigation) for (const item of investigation.publicPages) {
    browserPageTitles[item.id] = item.title;
    pageContent[item.id] = () => page(item.site, item.title, item.date, paragraphs(item.body));
  }

  const originalAnnanPage = pageContent.annan;
  pageContent.annan = () => originalAnnanPage().replace('<p class="related-page">楼主补充：', '<p class="related-page">相关公开报道：<a href="#" data-action="open-page" data-page="annan-news">安南高速事故报道</a></p><p class="related-page">楼主补充：');

  Object.assign(browserPageTitles, { "paper-forum": "纸页文学 · 迟到的读者", "paper-novel": "迟到的读者 · 未完稿存档", "paper-chat": "纸页文学 · 写作闲谈" });
  Object.assign(pageContent, {
    "paper-forum": () => page("纸页文学", "迟到的读者的帖子", "会员自2003年加入 · 旧版存档", '<p>写完的少，改过的多。未完稿也留着。</p><form data-form="browser-search"><label>站内查找 <input name="query" aria-label="搜索论坛" placeholder="帖子内容"></label><button>查找</button></form><p><button class="plain-link" data-action="open-page" data-page="paper-novel">小说·未完稿：《等屋里暖起来》</button></p><p><button class="plain-link" data-action="open-page" data-page="paper-chat">写作闲谈：《结尾写不下去》</button></p><p class="faint">旧帖可按作者或正文查找。</p>'),
    "paper-chat": () => page("纸页文学", "结尾写不下去", "迟到的读者 · 2004.11.06", paragraphs("有时写到结尾才发现，前面一直在替那个人找理由。\n\n我不想删。删掉就像从来没想过。先留在这里，等以后再看。") + '<p><button class="plain-link" data-action="open-page" data-page="paper-forum">返回作者页</button></p>'),
    "paper-novel": () => page("纸页文学 · 小说未完稿", "等屋里暖起来", "迟到的读者 · 发表于 <strong>2004.12.20</strong> · 原帖存档（未修订）", paragraphs(flow.novel) + '<section class="forum-reply member-reply"><p class="faint">折角书签 <span class="member-badge">VIP</span> · 2004.12.30</p><p class="member-ink">等等，湖畔那个案子不是28号才出的事吗？我22号就在这儿看过这篇了，拿死人锁门那段我记得很清楚。有人存过吗？</p></section><section class="forum-reply member-reply"><p class="faint">纸页小住 <span class="member-badge">VIP</span> · 2004.12.21</p><p class="member-ink">又是未完……先收藏了，楼主记得回来填。</p></section>' + '<p><button class="plain-link" data-action="open-page" data-page="paper-forum">返回作者页</button></p>')
  });
  const backupView = () => !backupAttachmentAvailable() ? '<article class="message-view"><p role="alert">这份附件尚未在本机邮件中找到。</p><button class="plain-link" data-action="mail-inbox">返回收件箱</button></article>' : '<article class="message-view backup-attachment"><button class="plain-link" data-action="open-thread" data-thread="sunianci">← 返回往来邮件</button><h1>旧稿与邮件.zip</h1><p>加密压缩文件</p><p>备注：口令是纸页文学上那篇未完稿的篇名，不含书名号。</p><p>原备注链接：<button class="plain-link" data-action="open-page" data-page="paper-forum">纸页文学／迟到的读者</button></p>' + (state.backupUnlocked ? '<p class="backup-read-status">已解密 · 阅读副本已保存到我的文档</p><button class="system-button" data-action="open-legacy-archive">打开阅读副本</button>' : '<form class="archive-password" data-form="unlock-backup"><h2>输入密码</h2><p>文件：旧稿与邮件.zip</p><label class="field">密码<input name="password" type="password" autocomplete="off" aria-label="备份密码"></label><p class="form-error" role="alert">' + escapeHtml(state.backupError || "") + '</p><button class="system-button" type="submit">解密</button></form>') + '</article>';
  const privateRecordView = () => {
    const item = state.archive.selected === "backup-note" ? backupNote : archiveRecord(state.archive.selected);
    if(!item) return legacyArchiveView();
    return '<article class="message-view"><button class="plain-link" data-action="open-legacy-archive">← 返回备份目录</button><h1>' + escapeHtml(item.title) + '</h1><p class="faint">' + escapeHtml(item.source || item.author || '原备份说明') + '</p>' + (item.image ? evidenceReader(item) : '') + paragraphs(item.body) + '<button class="plain-link" data-action="open-legacy-archive">返回备份目录</button></article>';
  };
  const doctorView = () => '<section class="doctor-letter-view"><div class="reader-pages"><article class="message-view doctor-letter"><h1>下一次见面</h1>' + paragraphs(flow.doctor).replace('<p>程守衡', '<p class="letter-signature">程守衡') + '<details class="letter-access-record"><summary>文件访问记录</summary><p>2008.08.02 01:16 · 上次完整填写并打开后附留言。<br>历史记录与本次填写分别保存。</p></details><p class="letter-address">地址：临川市第二医院 · 心理门诊 · 程守衡</p></article></div><footer class="reader-toolbar continuity-actions"><button class="system-button primary" data-action="go-hospital">带着地址去找她</button><button class="plain-link" data-action="open-continuity">回看记录</button></footer></section>';

  const documentFileIcon = kind => `<i class="document-file-icon document-file-${kind}" aria-hidden="true"></i>`;
  const documentFolderView = () => '<section class="my-documents-folder"><div class="folder-heading"><h1>我的文档</h1></div>'+(state.backupUnlocked?'<button class="document-file" data-action="resume-reading">'+documentFileIcon("mail")+'<span>旧稿与邮件 · 阅读副本</span><small>继续上次位置</small></button>':'<p class="faint">此文件夹为空。</p>')+'</section>';

  const browser = () => {
    // 旧版本停留在镜像页时，刷新应回到搜索首页，不再显示已下线的独立谜题。
    if (state.browser.page && retiredPuzzlePages.has(state.browser.page)) {
      state.browser.page = null;
      state.browser.query = "";
      state.browserNotice = "这条旧页面已归档。当前调查从湖畔村现场记录继续。";
      save();
    }
    let content = browserHome();
    if (state.browser.page && pageContent[state.browser.page]) content = pageContent[state.browser.page]();
    if (state.browser.query && !state.browser.page) content = browserResults(state.browser.query);
    return shell("浏览器", content);
  };

  const localDocumentChrome = () => '<div class="browser-chrome local-chrome">'+ieToolbar(true)+'<div class="browser-address-form"><label>地址(D)</label><div class="ie-address-field">'+xpIcon('browser')+'<input class="browser-address" aria-label="本地文件地址" readonly value="C:&#92;Documents and Settings&#92;沈知返&#92;我的文档&#92;旧稿与邮件&#92;'+(state.document==='identity'?'会谈留存&#92;你是？.htm':'阅读.htm')+'"><span>▾</span></div></div></div>';
  const documents = () => {
    if (["reading","identity"].includes(state.document)) return shell((state.document==='reading'?'旧稿与邮件':'你是？')+' - Microsoft Internet Explorer','<section class="browser-layout local-document">'+localDocumentChrome()+'<div class="document-paper">'+(state.document==='reading'?readingView():encryptedMailView())+'</div></section>');
    const frame = body => shell("我的文档", `<section class="documents"><aside class="documents-side"><section><h2>文件和文件夹任务</h2><p>查看或打开文件</p></section><section><h2>其他位置</h2><p>我的电脑</p><p>网上邻居</p></section><section><h2>详细信息</h2><p>我的文档</p></section></aside><main class="documents-main"><div class="documents-toolbar" aria-hidden="true"><span class="explorer-tool"><i class="explorer-icon explorer-back"></i><small>后退</small></span><span class="explorer-tool"><i class="explorer-icon explorer-forward"></i><small>前进</small></span><span class="explorer-separator"></span><span class="explorer-tool"><i class="explorer-icon explorer-up"></i><small>向上</small></span><span class="explorer-separator"></span><span class="explorer-tool explorer-tool-wide"><i class="explorer-icon explorer-search"></i><small>搜索</small></span><span class="explorer-tool explorer-tool-wide"><i class="explorer-icon explorer-folders"></i><small>文件夹</small></span><span class="explorer-tool explorer-tool-wide"><i class="explorer-icon explorer-views"></i><small>视图</small></span></div><div class="documents-address"><span>地址</span><div class="documents-address-field"><i class="documents-address-icon"></i><span>C:\\Documents and Settings\\沈知返\\我的文档</span><b>▼</b></div></div><div class="document-paper">${body}</div></main></section>`);
    return frame(state.document === "identity" ? encryptedMailView() : state.document === "reading" ? readingView() : documentFolderView());
  };

  const notes = () => {
    const records = state.notes.records.length ? `<ul class="investigation-log">${state.notes.records.map(item => `<li><b>${escapeHtml(item.source)}</b><span>${escapeHtml(item.label)}</span></li>`).join("")}</ul>` : `<p class="faint">还没有打开过的来源。</p>`;
    return shell("记事本", `<section class="notepad-client"><article class="notes"><h1>备忘录</h1><section><h2>我看过的资料</h2><p class="faint">你打开过的来源会按顺序记在这里。</p>${records}</section><hr class="rule"><form data-form="save-notes"><label class="field">我的笔记<textarea name="personal" aria-label="我的笔记" rows="7" placeholder="在这里写下你自己的判断……">${escapeHtml(state.notes.personal)}</textarea></label><p><button class="system-button" type="submit">保存笔记</button></p></form></article><div class="notepad-statusbar" aria-hidden="true"><span>Windows XP 记事本</span><span>行 1，列 1</span></div></section>`);
  };

  const readingKey = () => {
    if (state.currentApp === "browser") return `browser:${state.browser.page || "search:" + state.browser.query}`;
    if (state.currentApp === "documents" && ["reading","identity"].includes(state.document)) return `documents:${state.document}:${state.document === "reading" ? state.reading.index : state.nameReview.current}`;
    if (state.currentApp === "documents") return `documents:${state.document}:${state.document === "archive-search" ? state.archive.selected || (state.archive.continuous ? 'continuous' : `${state.archive.query}:${state.archive.year}`) : ""}`;
    if (state.currentApp === "mail") return `mail:${state.mail.view}:${["continuity", "encrypted"].includes(state.mail.view) && continuityReady() ? state.nameReview.current : state.mail.view === "thread" ? state.mail.thread : state.mail.view === "legacy-account" ? `${state.legacy.account}:${state.legacy.view}:${state.legacy.item ?? "all"}` : state.mail.view === "attachment" ? state.mail.attachment?.id : state.mail.query}`;
    return state.currentApp;
  };
  const pendingScrollTargets = new WeakMap();
  const restorePaneScroll = (pane, target) => {
    if(!pane)return;
    const images=[...pane.querySelectorAll('img')].filter(image=>!image.complete);
    if(!images.length){pane.scrollTop=target;return;}
    // 图片尚未解码时，浏览器会把保存位置钳到临时高度。等待尺寸就绪，
    // 但用户一旦自行滚动或操作该区域，就不再替他移动阅读位置。
    pendingScrollTargets.set(pane,target);
    const oldAnchor=pane.style.overflowAnchor;
    pane.style.overflowAnchor='none';
    let remaining=images.length,stopped=false;
    const cleanup=()=>{
      if(stopped)return;
      stopped=true;pendingScrollTargets.delete(pane);pane.style.overflowAnchor=oldAnchor;
      for(const type of ['wheel','touchmove','pointerdown','keydown'])pane.removeEventListener(type,userMoved,true);
      for(const image of images){image.removeEventListener('load',loaded);image.removeEventListener('error',loaded);}
    };
    const userMoved=event=>{
      if(event.type!=='keydown'||['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cleanup();
    };
    const apply=()=>{if(!stopped&&pane.isConnected)pane.scrollTop=target;else cleanup();};
    const loaded=()=>{
      remaining--;
      requestAnimationFrame(()=>{
        apply();
        if(remaining<=0)requestAnimationFrame(()=>{apply();cleanup();});
      });
    };
    for(const type of ['wheel','touchmove','pointerdown','keydown'])pane.addEventListener(type,userMoved,true);
    for(const image of images){image.addEventListener('load',loaded,{once:true});image.addEventListener('error',loaded,{once:true});}
    apply();
  };
  const rememberCurrentScroll = () => {
    if (!state.started) return;
    for(const node of app.querySelectorAll('.window[data-reading-scope]')) {
      const scope=node.dataset.readingScope;
      const body=node.querySelector('.window-body');
      if(body)state.appScrolls[scope]=pendingScrollTargets.get(body)??body.scrollTop;
      const preview=node.querySelector('.oe-preview');
      if(preview)state.appScrolls[preview.dataset.scrollKey]=pendingScrollTargets.get(preview)??preview.scrollTop;
      const pane=node.querySelector('.mail-content');
      if(pane)state.appScrolls[scope+':mail-content']=pendingScrollTargets.get(pane)??pane.scrollTop;
    }
  };

  // 按窗口内的资料路径分别保存输入；密码只留在内存，不写入存档。
  const formDrafts = new Map(Object.entries(state.formDrafts && typeof state.formDrafts === 'object' ? state.formDrafts : {}));
  let renderedScope = null;
  let freshBrowserInputs = false;
  let composing = false;
  const draftKey = field => field.closest('form[data-form]').dataset.form + ':' + field.name;
  const draftFields = () => [...app.querySelectorAll('form[data-form] input[name], form[data-form] textarea[name]')];
  const rememberFormDrafts = () => {
    if(!state.started)return;
    for(const node of app.querySelectorAll('.window[data-reading-scope]')) {
      const values={};
      for(const field of node.querySelectorAll('form[data-form] input[name],form[data-form] textarea[name]'))values[draftKey(field)]=field.value;
      formDrafts.set(node.dataset.readingScope,values);
    }
    while(formDrafts.size>40)formDrafts.delete(formDrafts.keys().next().value);
    state.formDrafts=Object.fromEntries([...formDrafts].map(([scope,values])=>[scope,Object.fromEntries(Object.entries(values).filter(([key])=>!key.endsWith(':password')))]));
  };
  const activeWindow = () => app.querySelector('.window[data-window-app="'+state.currentApp+'"]');
  const focusWindow = id => {
    if(state.currentApp===id)return;
    rememberCurrentScroll(); rememberFormDrafts();
    workspace.focus(state,id);
    openSystemMenu=null;
    app.querySelectorAll('.menu-popup').forEach(menu=>menu.remove());
    save();
    workspace.layout(app,state);
  };
  const render = () => {
    const focused = document.activeElement;
    const focusedWindow=focused?.closest?.('.window[data-window-app]');
    const focusScope=focusedWindow?.dataset.readingScope;
    const focusKey = focusedWindow?.dataset.windowApp===state.currentApp && focused?.matches('form[data-form] input[name], form[data-form] textarea[name]') ? draftKey(focused) : null;
    const selection = focusKey ? [focused.selectionStart, focused.selectionEnd] : null;
    rememberFormDrafts();
    if(freshBrowserInputs) {
      // 明确提交、点击链接或历史导航是一次新访问，不能复活目的页的旧地址草稿。
      const scope='browser:'+(state.browser.page||'search:'+state.browser.query);
      const drafts={...(formDrafts.get(scope)||{})};
      delete drafts['browser-address:address'];delete drafts['browser-search:query'];
      formDrafts.set(scope,drafts);state.formDrafts[scope]=drafts;
      freshBrowserInputs=false;save();
    }
    if (!state.started) { app.innerHTML = intro(); return; }
    workspace.normalize(state);
    if(appMeta[state.currentApp])workspace.focus(state,state.currentApp);
    const views = { desktop, mail, browser, documents, system, ending: () => '<section class="story-epilogue">' + endingView() + '</section>' };
    const foreground=state.currentApp;
    const frame = id => {
      const previous=state.currentApp, restored=state.windowRestored, menu=openSystemMenu;
      try {
        state.currentApp=id;
        state.windowRestored=!workspace.geometry(state,id,app.querySelector('.computer')).maximized;
        if(id!==foreground)openSystemMenu=null;
        return {html:views[id](),scope:readingKey()};
      } finally {state.currentApp=previous;state.windowRestored=restored;openSystemMenu=menu;}
    };
    const primary=appMeta[foreground]?frame(foreground):{html:(views[foreground]||desktop)(),scope:null};
    app.innerHTML=primary.html;
    const decorateWindow=(node,id,scope)=>{
      if(!node)return;
      node.dataset.windowApp=id;node.dataset.readingScope=scope;
      const preview=node.querySelector('.oe-preview');
      if(preview)preview.dataset.scrollKey=scope+':message:'+state.mail.messageIndex;
    };
    decorateWindow(app.querySelector('.window'),foreground,primary.scope);
    const host=app.querySelector('.computer');
    if(host) {
      for(const id of state.workspace.order) {
        if(id===foreground||state.minimizedApps.includes(id)||!state.openApps.includes(id)||!views[id])continue;
        const content=frame(id),template=document.createElement('template');
        template.innerHTML=content.html;
        const node=template.content.querySelector('.window');
        decorateWindow(node,id,content.scope);
        if(node)host.append(node);
      }
      workspace.decorate(app,state,{save,onFocus:focusWindow,onChange:render});
    }
    renderedScope=readingKey();
    for (const field of draftFields()) {
      const scope=field.closest('.window')?.dataset.readingScope;
      const drafts=formDrafts.get(scope)||{};
      if (draftKey(field)!=='mail-search:query' && Object.hasOwn(drafts, draftKey(field))) field.value = drafts[draftKey(field)];
      if (scope===focusScope&&draftKey(field) === focusKey) { field.focus(); if(selection[0] !== null) field.setSelectionRange(...selection); }
    }
    window.__endingFilm.mount(app);
    window.__archiveImageViewer?.mount(app);
    for(const link of app.querySelectorAll('a[data-page]')) {
      link.classList.toggle('visited-page',state.browser.visitedPages.includes(link.dataset.page));
    }
    requestAnimationFrame(() => {
      for(const node of app.querySelectorAll('.window[data-reading-scope]')) {
        const scope=node.dataset.readingScope,body=node.querySelector('.window-body');
        restorePaneScroll(body,Number(state.appScrolls[scope]||0));
        const preview=node.querySelector('.oe-preview');
        if(preview)restorePaneScroll(preview,Number(state.appScrolls[preview.dataset.scrollKey]||0));
        const pane=node.querySelector('.mail-content');
        restorePaneScroll(pane,Number(state.appScrolls[scope+':mail-content']||0));
        node.querySelector('.oe-message-list tr.selected')?.scrollIntoView({block:'nearest'});
      }
      for (const panel of app.querySelectorAll?.('[data-pan-key]') || []) {
        const position = state.evidencePositions[panel.dataset.panKey];
        if (position) { panel.scrollLeft = position.left; panel.scrollTop = position.top; }
      }
    });
  };

  const openThread = id => {
    const thread = threads[id];
    if (!thread || !canOpenThread(id)) return;
    // 阅读个人往来不等于查看现场原始材料。
    recordInvestigation("邮件", `${threadDisplayName(id)}｜${thread.subject}`);
    if (!state.mail.readThreads.includes(id)) state.mail.readThreads.push(id);
    if (id === "xuzhaoran") state.knownNames[id] = "mail:statement";
    cacheThread(id);
    state.currentApp = "mail";
    if (!state.openApps.includes("mail")) state.openApps.push("mail");
    state.mail.view = "thread";
    state.mail.messageIndex = Math.max(0,Math.min(thread.messages.length-1,Number(state.mail.selectedMessages[id])||0));
    markMessageRead(id,state.mail.messageIndex);
    state.mail.thread = id;
    state.mail.query = ""; state.mail.searchDraft = "";
    state.mail.searchHistoryOpen = false;
    save();
    render();
  };

  app.addEventListener("scroll", event => {
    const panel = event.target;
    if (panel?.dataset?.panKey) state.evidencePositions[panel.dataset.panKey] = { left: panel.scrollLeft, top: panel.scrollTop };
  }, true);
  window.addEventListener?.("pagehide", () => { rememberCurrentScroll(); rememberFormDrafts(); save(); });
  const focusEventWindow = event => {
    const node=event.target.closest?.('.window[data-window-app]');
    if(node)focusWindow(node.dataset.windowApp);
  };
  app.addEventListener('pointerdown',focusEventWindow,true);
  app.addEventListener('focusin',focusEventWindow,true);
  app.addEventListener('submit',focusEventWindow,true);

  window.addEventListener?.('keydown',event=>{
    if(event.key==='Escape') {if(openSystemMenu||aboutWindow){openSystemMenu=null;aboutWindow=false;render();}return;}
    if(event.key==='F5'&&state.started){event.preventDefault();rememberCurrentScroll();save();render();}
    if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==='f'&&state.currentApp==='mail'){event.preventDefault();activeWindow()?.querySelector('[data-action="mail-focus-search"]')?.click();}
    if(event.key==='ArrowDown'||event.key==='ArrowUp') {
      const row=event.target.closest('[data-action="select-message"]');
      if(row){event.preventDefault();const next=event.key==='ArrowDown'?row.nextElementSibling:row.previousElementSibling;if(next){next.click();activeWindow()?.querySelector('tr.selected button')?.focus();}}
    }
  });
  app.addEventListener('dblclick',event=>{if(event.target.closest('.window-titlebar')&&!event.target.closest('button'))event.target.closest('.window')?.querySelector('[data-action="window-size"]')?.click();});
  app.addEventListener("input", event => {
    rememberFormDrafts();
    const owner=event.target.closest('.window')||app;
    if(event.target.matches('textarea[name="names"]')) {
      state.nameReview.draft=event.target.value;
      state.nameReview.checkedAnswer=null;
      const ok=save(), status=owner.querySelector('#name-save-status');
      if(status)status.textContent=ok?'输入内容已保存在本机（尚未核对）':'未能保存，请复制输入内容';
      nameFeedback='';
      const feedback=owner.querySelector('#final-error');if(feedback){feedback.textContent='';feedback.className='name-feedback';}
    }
    if(event.target.matches('[data-form="mail-search"] input')) {
      state.mail.searchDraft=event.target.value;save();
      const status=owner.querySelector('#mail-search-status');
      if(status)status.textContent='搜索内容已更改，按 Enter 或点击“查找”。';
    }
    save();
  });
  app.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if(openSystemMenu && target?.dataset.action !== 'system-menu') {
      openSystemMenu=null;
      app.querySelectorAll('.menu-popup').forEach(menu=>menu.remove());
      app.querySelectorAll('.menu-anchor>button').forEach(button=>button.setAttribute('aria-expanded','false'));
    }
    if (!target) return;
    if (target.tagName === "A") event.preventDefault();
    rememberCurrentScroll();
    const action = target.dataset.action;
    if (action === "identity-hint-next") {
      const current=identityHintIndex();
      if (finalGateReady() && !continuityReady() && current>=0 && current<identityHints.length-1) {
        state.nameReview.hintLevel=current+1;
        save(); render();
      }
      return;
    }
    if (action === 'system-menu') {openSystemMenu=openSystemMenu===target.dataset.menu?null:target.dataset.menu;render();return;}
    if (action === 'ui-about') {aboutWindow=true;render();return;}
    if (action === 'ui-about-close') {aboutWindow=false;render();return;}
    if (action === 'focus-address') {activeWindow()?.querySelector('.browser-address')?.focus();activeWindow()?.querySelector('.browser-address')?.select();return;}
    if (action === 'window-size') {workspace.toggleSize(state,state.currentApp,app.querySelector('.computer'));save();render();return;}
    if (action === 'mail-focus-search') {const input=app.querySelector('[data-form="mail-search"] input');input?.focus();input?.select();return;}
    if (action === 'select-message') {state.mail.messageIndex=Number(target.dataset.index)||0;markMessageRead(state.mail.thread,state.mail.messageIndex);save();render();return;}
    if (action === 'local-folder') {state.document='folder';save();render();return;}
    if (action === 'local-refresh') {render();return;}
    if (action === "return-computer") { workspace.showDesktop(state); if(state.mail.view==='ending')state.mail.view='final'; save(); render(); return; }
    if (["open-delivery", "open-archive-review", "inspect-local-data", "start-migration", "finish-migration", "accept-method-answer", "open-appointment-reminder", "open-archive-search"].includes(action)) return;
    if (action === "read-junk") { state.currentApp="mail"; state.mail.view="junk"; state.mail.noticeIndex=Number(target.dataset.index)||0; save(); render(); return; }
    if (action === "read-backup-note" && state.backupUnlocked) { state.archive.selected="backup-note"; state.currentApp="mail"; state.mail.view="record"; save(); render(); return; }
    if (action === "mail-use-suggestion") {
      const query = target.dataset.query;
      if (query !== mailSearchSuggestion(state.mail.query)) return;
      const form = app.querySelector('[data-form="mail-search"]');
      form.elements.query.value = query;
      form.requestSubmit();
      return;
    }
    if (action === "mail-clear-search") { const field=app.querySelector('[data-form="mail-search"] input');if(field){field.value='';field.focus();field.dispatchEvent(new Event('input',{bubbles:true}));}return; }
    if (['resume-reading','reading-prev','reading-next','reading-jump','reading-review','reading-return','reading-identity'].includes(action)) {
      if(!state.backupUnlocked)return;
      if(action==='reading-return'||action==='reading-identity') {if(!finalGateReady())return;state.reading.returnTo=null;state.currentApp='documents';state.document='identity';save();render();return;}
      if(action==='resume-reading'&&finalGateReady()){state.currentApp='documents';state.document='identity';save();render();return;}
      if(action==='reading-review')state.reading.returnTo='identity';
      let index=state.reading.index;
      if(action==='reading-next')index++;if(action==='reading-prev')index--;
      if(action==='reading-jump'){index=Number(target.dataset.index);if(!Number.isInteger(index)||index<0||index>state.reading.furthest)return;}
      openReading(index);return;
    }
    if (action === "go-hospital" && state.finalUnlocked) { state.archiveCreated=true; state.currentApp="ending"; state.mail.view="ending"; save(); render(); window.__endingFilm.play(app); return; }
    if (action === "open-document" && target.dataset.document === "identity" && !finalGateReady()) { if(state.backupUnlocked)openReading();return; }
    if (action === "open-document") { state.document = target.dataset.document === "identity" ? "identity" : "folder"; state.currentApp="documents"; if (!state.openApps.includes("documents")) state.openApps.push("documents"); save(); render(); return; }
    if (["open-final-mail", "open-continuity", "review-page", "name-review-next"].includes(action)) {
      if (!state.backupUnlocked) return;
      if (action === "name-review-next") {
        if (!continuityReady()) return;
        const p=state.nameReview.current;
        if (!continuity.canAdvance(state.nameReview.submitted, p)) return;
        if (!state.nameReview.completed.includes(p)) state.nameReview.completed.push(p);
        const next=continuity.layerIds[continuity.layerIds.indexOf(p)+1];
        if(next) state.nameReview.current=next; else state.finalUnlocked=true;
      } else if (action === "review-page") {
        const p=target.dataset.page; if (!state.nameReview.completed.includes(p)) return; state.nameReview.current=p;
        state.finalUnlocked=false;
      } else if (action === "open-continuity") { state.nameReview.current="core"; state.nameReview.viewingRecords=true; state.finalUnlocked=false; }
      nameFeedback = "";
      state.currentApp="documents"; state.document="identity"; save(); render(); return;
    }
    if (action === "evidence-zoom" && archiveAvailable() && window.__evidenceReader?.validModes(target.dataset.record).length) {
      const delta = Number(target.dataset.delta);
      if (delta !== 0.5 && delta !== -0.5) return;
      state.evidenceZoom[target.dataset.record] = Math.min(3, Math.max(1, (Number(state.evidenceZoom[target.dataset.record]) || 1) + delta));
      save(); render(); return;
    }
    if (action === "school-view" && ["position", "compare"].includes(target.dataset.view)) { state.schoolView = target.dataset.view; save(); render(); return; }
    if (action === "evidence-mode" && archiveAvailable() && archiveRecord(target.dataset.record) && window.__evidenceReader?.validModes(target.dataset.record).includes(target.dataset.mode)) {
      state.evidenceView[target.dataset.record] = target.dataset.mode; save(); render(); return;
    }
    if (action === "archive-continuous" && archiveAvailable()) { state.archive.continuous = !state.archive.continuous; state.archiveSort = "year"; state.archive.selected = null; save(); render(); return; }
    if (action === "retry-save") { save(); render(); }
    if (action === "desktop-item") return;
    if (action === "close-system-dialog" && state.currentApp === "system") {
      state.systemDialog = null;
      save(); render(); return;
    }
    if (action === "system-invalid" && state.currentApp === "system") {
      state.systemDialog = { title: "系统提示", message: "当前项目无法打开。" };
      save(); render(); return;
    }
    if (action === "open-drive" && state.currentApp === "system" && state.systemWindow === "computer" && ["C:", "D:"].includes(target.dataset.drive)) {
      state.systemDialog = { title: "无法访问", message: `无法访问 ${target.dataset.drive}。设备尚未就绪。` };
      save(); render(); return;
    }
    if (action === "request-reset") { state.resetPrompt = true; save(); render(); return; }
    if (action === "cancel-reset") { state.resetPrompt = false; save(); render(); return; }
    if (action === "reset-game") {
      formDrafts.clear(); renderedScope = null; composing = false;
      const clean = JSON.parse(JSON.stringify(defaults));
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, clean);
      state.reading = { version: window.__linearArchive.version, index: 0, furthest: 0, returnTo: null };
      try { localStorage.removeItem(storageKey); } catch { /* save below reports storage errors if unavailable */ }
      save(); render(); return;
    }
    if (action === "open-local-mail") { state.mail.loggedIn = true; state.mail.view = "self-note"; state.currentApp = "mail"; if (!state.openApps.includes("mail")) state.openApps.push("mail"); save(); render(); }
    if (action === "school-clip" && schoolClips[target.dataset.clip]) { state.schoolClip = target.dataset.clip; save(); render(); }
    if (action === "archive-sort") { state.archiveSort = state.archiveSort === "year" ? "recent" : "year"; save(); render(); }
    if (action === "power-on") {
      startupSound.currentTime = 0;
      startupSound.play().catch(() => {});
      state.started = true;
      state.currentApp = "desktop";
      state.minimizedApps = [];
      state.openApps = [];
      state.startMenuOpen = false;
      state.browser = JSON.parse(JSON.stringify(defaults.browser));
      save();
      render();
    }
    if (action === "toggle-start") { state.startMenuOpen = !state.startMenuOpen; save(); render(); }
    if (action === "open-app" || action === "restore-app") launchApp(target.dataset.app);
    if (action === "show-desktop") {workspace.showDesktop(state);state.startMenuOpen=false;save();render();return;}
    if (action === "minimize") {minimizeCurrentApp();return;}
    if (action === "close") {
      if (state.currentApp === "system") { state.systemWindow = null; state.systemDialog = null; }
      workspace.close(state); state.startMenuOpen = false; save(); render();return;
    }
    if (action === "mail-inbox") { state.currentApp = "mail"; if (!state.openApps.includes("mail")) state.openApps.push("mail"); state.mail.view = "inbox"; state.mail.thread = null; state.mail.query = ""; state.mail.searchDraft = ""; state.mail.searchHistoryOpen = false; save(); render(); }
    if (action === "open-self-note") { state.currentApp = "mail"; if (!state.openApps.includes("mail")) state.openApps.push("mail"); state.mail.view = "self-note"; state.mail.thread = null; state.mail.query = ""; state.mail.searchDraft = ""; state.mail.searchHistoryOpen = false; save(); render(); }
    if (action === "open-appointment-reminder") { state.currentApp = "mail"; if (!state.openApps.includes("mail")) state.openApps.push("mail"); state.mail.view = "appointment-reminder"; state.mail.thread = null; state.mail.attachment = null; state.mail.query = ""; state.mail.searchDraft = ""; state.mail.searchHistoryOpen = false; save(); render(); return; }
    if (action === "open-thread") openThread(target.dataset.thread);
    if (action === "open-retained-backup") {
      if (!state.backupAttachmentOpened || !backupAttachmentAvailable()) return;
      workspace.focus(state,'mail');
      state.mail.attachment={thread:'sunianci',id:'private-backup'};
      state.mail.thread='sunianci';state.mail.view='attachment';
      save();render();return;
    }
    if (action === "open-mail-attachment") {
      const threadId = target.dataset.thread;
      const file = attachmentFor(threadId, target.dataset.attachment);
      if (!file || !state.mail.loggedIn || (threadId !== "xuzhaoran" && !state.mail.cachedThreads.includes(threadId))) return;
      if (file.document === "case-review") {
        state.currentApp = "documents";
        if (!state.openApps.includes("documents")) state.openApps.push("documents");
        state.document = file.document;
        recordInvestigation("邮件附件", file.name); save(); render(); return;
      }
      if (file.recovery && openPersonArchive(threadId, file)) {
        save(); render(); return;
      }
      state.mail.attachment = { thread: threadId, id: file.id };
      if (file.id === 'private-backup') state.backupAttachmentOpened = true;
      state.currentApp = "mail"; state.mail.view = "attachment";
      markCaseClue(caseSources.find(item => item.page === file.page)?.clue);
      recordInvestigation("邮件附件", file.name); save(); render();
    }
    if (action === "mail-toggle-search-history") { state.mail.searchHistoryOpen = !state.mail.searchHistoryOpen; save(); render(); }
    if (action === "mail-run-history") { state.currentApp = "mail"; state.mail.view = "search"; state.mail.thread = null; state.mail.query = target.dataset.query || ""; state.mail.searchDraft = state.mail.query; state.mail.searchHistoryOpen = false; save(); render(); }
    if (action === "browser-home") navigateBrowser({ page: null, query: "" });
    if (action === "browser-back") {
      const current = currentBrowserRoute();
      let route = state.browser.backStack.pop();
      while (route && retiredPuzzlePages.has(route.page)) route = state.browser.backStack.pop();
      if (route || current.page || current.query) {
        state.browser.forwardStack = [...state.browser.forwardStack, current].slice(-32);
        state.currentApp = "browser"; state.browser.page = route?.page || null; state.browser.query = route?.query || "";
        state.browser.historyOpen = false; freshBrowserInputs=true; save(); render();
      }
    }
    if (action === "browser-forward") {
      let route = state.browser.forwardStack.pop();
      while (route && retiredPuzzlePages.has(route.page)) route = state.browser.forwardStack.pop();
      if (route) {
        state.browser.backStack = [...state.browser.backStack, currentBrowserRoute()].slice(-32);
        state.currentApp = "browser"; state.browser.page = route.page || null; state.browser.query = route.query || "";
        state.browser.historyOpen = false; freshBrowserInputs=true; save(); render();
      }
    }
    if (action === "browser-toggle-history") { state.browser.historyOpen = !state.browser.historyOpen; save(); render(); }
    if (action === "browser-open-history") {
      const visit = state.browser.visits[Number(target.dataset.index)];
      if (visit && !retiredPuzzlePages.has(visit.page)) navigateBrowser({ page: visit.page || null, query: visit.query || "" });
    }
    if (action === "open-page") {
      const pageId = target.dataset.page;
      if (!pageId || !Object.hasOwn(pageContent, pageId) || retiredPuzzlePages.has(pageId)) {
        state.browserNotice = "本机快照未收录此页面，当前资料仍保留。";
        save(); render(); return;
      }
      state.browserNotice = "";
      navigateBrowser({ page: pageId, query: "" });
    }
    if (action === "manage-accounts") { state.currentApp = "mail"; state.mail.view = "manage"; save(); render(); }
    if (action === "open-legacy-archive") { if (!archiveEntryAvailable()) return; openReading(); return; }
    if (action === "open-legacy-account") {
      const id = target.dataset.account;
      if (!archiveEntryAvailable() || !legacyAccounts[id]) return;
      if (!accountRecovered(id)) state.recoveredAccounts.push(id);
      state.migration = true;
      state.legacy = { view: "core", account: id, item: null };
      state.coreRecords[id] = true;
      state.currentApp = "mail"; state.mail.view = "legacy-account"; save(); render();
    }
    if (action === "legacy-view") {
      if (!archiveEntryAvailable() || !legacyAccounts[state.legacy.account] || target.dataset.legacyView !== "core") return;
      state.legacy = { ...state.legacy, view: "core", item: null };
      state.currentApp = "mail"; state.mail.view = "legacy-account"; save(); render();
    }
    if (action === "open-legacy-item" && archiveAvailable() && archiveEntryAvailable()) {
      const account = legacyAccounts[state.legacy.account], kind = target.dataset.kind, index = Number(target.dataset.index);
      if (!account || !["drafts", "files"].includes(kind) || !Number.isInteger(index) || !account[kind][index]) return;
      state.legacy.view = kind; state.legacy.item = index;
      rememberArchiveRecord(archiveRecord(`legacy:${state.legacy.account}:${kind}:${index}`));
      recordInvestigation("本机副本", `${accountLabel(state.legacy.account)}｜${account[kind][index][kind === "drafts" ? 1 : 0]}`);
      save(); render();
    }
    if (action === "open-encrypted" && finalGateReady()) { state.currentApp = "mail"; state.mail.view = "encrypted"; save(); render(); }
    if (action === "open-continuity" && (continuityReady() || state.finalUnlocked)) {
      // 旧版已通关存档当时要求八姓名；保留它的结局，夹页仅供自主回看。
      if (!continuityReady()) state.nameReview.submitted = continuity.people.map(person => person.id);
      state.nameReview.current = continuityPending()[0] || "core";
      state.currentApp = "mail"; state.mail.view = "continuity"; save(); render();
    }
    if (action === "open-final-mail" && state.finalUnlocked) { state.currentApp = "mail"; state.mail.view = "final"; save(); render(); }
    if (action === "open-handover" && state.finalUnlocked) { state.currentApp = "mail"; state.mail.view = "handover"; save(); render(); }
    if (action === "open-handover-document" && state.finalUnlocked) { state.currentApp = "documents"; if (!state.openApps.includes("documents")) state.openApps.push("documents"); state.document = "handover"; save(); render(); }
    if (action === "open-document") {
      const id = target.dataset.document;
      if (id === "archive-search" && !archiveIndexAvailable()) return;
      if (id === "archive-file" && !recordAvailable(archiveRecord(state.archive.selected))) return;
      if (id === "case-review" && !bnbReady()) return;
      if (["case-notes", "enrollment-directory"].includes(id) && (!archiveRootReady() || !archiveEntryAvailable())) return;
      if (["handover", "case-letters"].includes(id) && !state.finalUnlocked) return;
      state.currentApp = "documents";
      if (!state.openApps.includes("documents")) state.openApps.push("documents");
      state.document = id;
      if (id === "enrollment-directory" && !enrollmentAvailable()) return;
      if (id === "archive-search") state.archive.selected = null;
      if (id === "archive-search") state.archive.continuous = false;
      if (id === "case-notes") recordInvestigation("本机文档", "沈知返｜旧案摘记.txt");
      if (id === "case-letters") recordInvestigation("本机文档", "季念真署名｜未寄出_给母亲.txt");
      if (id === "case-review") recordInvestigation("本机文档", "湖畔现场核对.htm");
      save(); render();
    }
    if (["open-archive-search", "archive-back", "archive-history", "archive-clear-year", "open-archive-record"].includes(action)) {
      if (!archiveIndexAvailable() || !investigation) return;
      if (action === "open-archive-record") {
        showArchiveRecord(target.dataset.record); return;
      } else {
        state.archive.selected = null;
        state.archive.continuous = false;
        if (action === "archive-history") {
          const search = state.archive.searches[Number(target.dataset.index)];
          if (search) Object.assign(state.archive, search, { scope: Object.hasOwn(archiveScopes, search.scope) ? search.scope : "all", searched: true });
        }
        if (action === "archive-clear-year") state.archive.year = "";
      }
      state.currentApp = "documents"; state.document = "archive-search";
      if (!state.openApps.includes("documents")) state.openApps.push("documents");
      save(); render();
    }
    if (action === "save-archive-comparison" && archiveAvailable()) {
      const pair = [state.archive.selected, state.archive.compare];
      if (pair[0] === pair[1] || !pair.every(id => archiveRecord(id) && state.archive.opened.includes(id))) return;
      if (!state.archive.comparisons.some(saved => pair.every(id => saved.includes(id)))) state.archive.comparisons = [...state.archive.comparisons, pair].slice(-20);
      save(); render();
    }
    if (action === "open-archive-comparison" && archiveAvailable()) {
      const pair = state.archive.comparisons[Number(target.dataset.index)];
      if (!pair || !pair.every(id => archiveRecord(id) && state.archive.opened.includes(id))) return;
      state.archive.compare = pair[1]; showArchiveRecord(pair[0]);
    }
  });

  app.addEventListener("dblclick", event => {
    const target = event.target.closest('[data-action="desktop-item"]');
    if (target) {
      const item = target.dataset.item;
      if (!["computer", "network", "recycle"].includes(item)) return;
      state.systemWindow = item;
      state.systemDialog = null;
      state.desktopNotice = "";
      state.currentApp = "system";
      state.startMenuOpen = false;
      save(); render();
      return;
    }
    const drive = event.target.closest('[data-action="open-drive"]');
    if (drive && state.currentApp === "system" && state.systemWindow === "computer" && ["C:", "D:"].includes(drive.dataset.drive)) {
      state.systemDialog = { drive: drive.dataset.drive };
      save(); render();
    }
  });

  app.addEventListener('compositionstart', () => { composing = true; });
  app.addEventListener('compositionend', () => { composing = false; });
  app.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault();
  }, true);
  app.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (composing) return;
    rememberCurrentScroll();
    if (form.dataset.form === "browser-address") {
      openBrowserAddress(String(new FormData(form).get("address") || ""));
    }
    if (form.dataset.form === "mail-search") {
      const query = String(new FormData(form).get("query") || "").trim();
      const successful = Boolean(query && mailSearchMatches(query).length);
      if (successful) rememberMailSearch(query);
      state.currentApp = "mail"; state.mail.view = "search"; state.mail.thread = null; state.mail.query = query; state.mail.searchDraft = query; state.mail.searchHistoryOpen = false; save(); render();
    }
    if (form.dataset.form === "browser-search") {
      const query = String(new FormData(form).get("query") || "").trim();
      navigateBrowser({ page: null, query });
    }
    if (form.dataset.form === "archive-search" && archiveIndexAvailable()) {
      const data = new FormData(form);
      const query = String(data.get("query") || "").trim();
      const year = String(data.get("year") || "").trim();
      const scope = String(data.get("scope") || "all");
      if (year && !/^\d{4}$/.test(year)) return;
      if (!Object.hasOwn(archiveScopes, scope)) return;
      Object.assign(state.archive, { query, year, scope, searched: true, selected: null });
      state.archive.continuous = false;
      state.archive.searches = [{ query, year, scope }, ...state.archive.searches.filter(item => item.query !== query || item.year !== year || item.scope !== scope)].slice(0, 8);
      state.currentApp = "documents"; state.document = "archive-search";
      save(); render();
    }
    if (form.dataset.form === "file-annotation" && archiveAvailable()) {
      const data = new FormData(form), id = String(data.get("record") || "");
      if (!state.archive.opened.includes(id)) return;
      const year = String(data.get("year") || "").trim(), note = String(data.get("note") || "").slice(0,500);
      if (year && !/^(19|20)\d{2}$/.test(year)) { const error = document.querySelector("#annotation-error-" + id); if (error) error.textContent = "填写四位年份，或留空保留疑问。"; return; }
      state.fileAnnotations[id] = { year, note };
      save(); render();
    }
    if (form.dataset.form === "archive-compare" && archiveAvailable()) {
      const id = String(new FormData(form).get("record") || "");
      state.archive.compare = state.archive.opened.includes(id) ? id : null;
      save(); render();
    }
    if (form.dataset.form === "save-notes") {
      state.notes.personal = String(new FormData(form).get("personal") || "").trim();
      save();
      render();
    }
    if (form.dataset.form === "unlock-backup") {
      if (!backupAttachmentAvailable()) return;
      if (flow.passwordMatches(new FormData(form).get("password"))) {
        state.backupUnlocked=true; state.backupAttachmentOpened=true; state.backupError=""; state.recoveredAccounts=[...mailOrder]; state.reading.returnTo=null; state.appScrolls["documents:reading:0"]=0; openReading(0); return;
      } else state.backupError="密码不正确。";
      save(); render(); return;
    }
    if (["unlock-document", "case-method", "case-review", "enrollment-directory"].includes(form.dataset.form)) return;
    if (form.dataset.form === "unlock-final") {
      const raw = String(new FormData(form).get("names") || "");
      state.nameReview.draft = raw;
      const result = continuity.inspectNames(raw);
      nameFeedbackKind = "error";
      if (!finalGateReady()) nameFeedback = "先读完前面的原件，再提交回答。";
      else if (result.error === "empty") nameFeedback = "请输入回答。";
      else if (!result.error && continuity.hasAll(result.ids)) {
        state.nameReview.submitted = result.ids;
        state.nameReview.current = "core";
        state.nameReview.completed = [];
        state.nameReview.viewingRecords = false;
        state.appScrolls['documents:identity:core']=0;
        nameFeedback = "回答正确。";
        nameFeedbackKind = "success";
      } else {
        const normalized = continuity.normalizeSubmission(raw);
        if (normalized && !state.nameReview.wrongSubmissions.includes(normalized)) state.nameReview.wrongSubmissions.push(normalized);
        nameFeedback = !result.error && result.ids.length >= 5 ? "回答尚不完整。" : "答案不正确。";
        nameFeedbackKind = !result.error && result.ids.length >= 5 ? "partial" : "error";
      }
      state.nameReview.checkedAnswer={raw,text:nameFeedback,kind:nameFeedbackKind};
      if (!save()) nameFeedback = "本次记录未能保存到本机。请复制输入内容，并检查浏览器存储权限后重试。";
      render();
    }

  });

  render();
})();




