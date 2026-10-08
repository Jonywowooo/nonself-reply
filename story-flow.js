/* 2026-09-28 主线：历史通信 / 小说 / 私人备份 / 身份复核。
 * 纯规则可在隔离测试中使用；不读取或重置真实存档。 */
(() => {
  "use strict";
  const order = ["xuzhaoran", "jiangci", "ruanxinran", "fangxingzhi", "qixiangsheng", "sunianci"];
  const sources = { xuzhaoran: [], jiangci: ["annan", "annan-forum"], ruanxinran: ["405", "405-forum"], fangxingzhi: ["yanjiang", "yanjiang-forum"], qixiangsheng: ["zuan", "zuan-forum"], sunianci: ["photo", "photo-guestbook"] };
  // 联系人署名是检索依据；阅读顺序不应使正确署名产生假阴性。
  const canDiscover = (state, id) => order.includes(id);
  const complete = state => order.every(id => state.mail.readThreads.includes(id));
  const normalizePassword = value => String(value).normalize("NFKC").replace(/[\s《》「」“”]/gu, "");
  const passwordMatches = value => normalizePassword(value) === "等屋里暖起来";
  const intro = "沈知返是我的女朋友。昨天，我们约好了见面，她却一直没有来。\n\n她偶尔也会迟到，但总会打电话告诉我。这一次，从白天等到晚上，电话始终无人接听。今天一早，我用她留给我的备用钥匙打开了她家的门。屋里没人，包不在，常用的电脑却留在桌上。\n\n最近，她一直在查一桩旧案。报道说，一间起火的屋子里，门是尸体自己锁上的。她陆续联系上了几名知情人，和他们通过邮件谈过当年的事。最后一次见面，她对我说：‘等这些邮件对上，也许就知道是怎么回事了。’\n\n那天点单，我问她要不要也来杯咖啡。她摇头：‘我不喝咖啡，给我点茶。’茶端来太烫，她推到一边，先问我周末想吃什么。临走时，我们把地方约好了。\n\n我不知道她去了哪里，也不知道失联和那桩旧案有没有关系。但她最后联系过谁、约过什么人，也许还留在这台电脑里。\n\n先看看她留下的邮件。我得找到她。";
  const novel = "屋子冷得像一口没有盖好的井。\n\n他已经死了。她知道，伤口不会因为接下来的一场火就变成别的东西。可进来的人总要先看门，再看里面的人。她希望他们把先后弄反。\n\n那是一根平放的旧横闩。没有弹簧，沿着闩杆滑动，便能进入锁扣。她让他的右手握住闩杆，摆好手臂，等僵硬把这个握持的姿势留住。横闩还没有进入锁扣。\n\n她退出展厅，把门关上。门已经关了，却还没有上闩。\n\n火先烧到桌边。屋里的温度慢慢升高，原本摆好的上肢逐渐屈曲，小臂向身体收拢。握着横闩的手没有松开，随着小臂移动，牵着闩杆滑向锁扣。\n\n横闩终于进入锁扣。门直到这时才真正锁住。死者的手仍握在横闩上。\n\n他没有醒，也没有替自己做过决定。\n\n走廊里的人后来会说：一定是他自己锁的。她想，只要这句话先被说出来，其他的话就会迟一点。\n\n她站在楼下，等屋里暖起来。\n\n（未完）";
  const doctor = "沈知返：\n\n这些名字，现在对你应该不只是几个陌生收件人了。此前会谈中出现过的自述，我分开保留在前面的页里。你不必接受我一句话的解释，先对照你自己找到的记录。\n\n你曾问我，能不能只留下不会伤害人的那个自己。我们下一次见面谈。不要再靠删除文件来解决这件事。\n\n如果你已经把这些经历认了回来，8月2日上午十点到市二院心理门诊找我。我会留出时间。你本人来就可以，电脑不用带。\n\n程守衡\n2008年7月4日留存";
  const ending = "8月3日下午，我拿着电脑里找到的门诊地址，到了市二院。护士问我和沈知返是什么关系。\n\n“我是她的恋人。她昨天没有赴约，电话也一直打不通。”\n\n护士带我走进房间。我终于见到了沈。\n\n她坐在靠窗的位置，衣服还是失约前那一身。她叫了我的名字，问我怎么来得这么晚。\n\n程守衡说，她昨天来过以后一直留在这里，现在稳定了。\n\n我想问的事情很多。我问她，那些邮件究竟是怎么回事。\n\n‘到这里就好。’她说。\n\n她指了指我手里的纸杯。\n\n‘咖啡？给我吧。’\n\n我正要说你不喝这个，她已经接过去，喝了一口。\n\n‘不用加糖。’\n\n我站在门口，忽然想不起该先问哪一句。\n\n护士叫我去走廊核对来访登记。门没有完全合上。程守衡还留在沈身边，我听见他向她问话。\n\n‘这次没有让她把话说完。’程守衡说。\n\n他停了一下。\n\n‘沈知返还会回来吗？’\n\n沈笑了一声。\n\n‘你不是已经帮我处理好了吗？’\n\n纸杯被轻轻放回桌上。";
  const suggestAlias = (value, knownAliases) => {
    const query = String(value).normalize("NFKC").trim();
    if (query.length < 2) return "";
    const candidates = [...new Set(knownAliases)].filter(alias => {
      if (alias.includes(query) && alias !== query) return true;
      if (Math.abs(alias.length - query.length) !== 1) return false;
      const longer = alias.length > query.length ? alias : query;
      const shorter = alias.length > query.length ? query : alias;
      return [...longer].some((_, i) => longer.slice(0,i) + longer.slice(i+1) === shorter);
    });
    return candidates.length === 1 ? candidates[0] : "";
  };
  const api = { suggestAlias, order, sources, canDiscover, complete, normalizePassword, passwordMatches, intro, novel, doctor, ending };
  if (typeof window !== "undefined") window.__storyFlow = api;
  if (typeof module !== "undefined") module.exports = api;
})();
