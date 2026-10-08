/* 年代资料及检索规则。公开资料与本机原件分表，禁止混合索引。 */
(() => {
  'use strict';
  const publicPages = [
    { id: 'book-award', title: '王小波作品资料：《黄金时代》', site: '读书资料室', date: '文学资料条目', terms: ['王小波', '黄金时代', '联合报', '连载', '获奖', '小说', '小说奖'], body: '《黄金时代》，王小波著。\n\n获奖记录：1991年第十三届联合报文学奖，中篇小说奖。\n\n馆藏分类：中篇小说。版本及重印信息见各馆藏本版权页。' },
    { id: 'worldcup-final', title: '世界杯决赛资料：巴西与意大利的点球大战', site: '体育资料库', date: '赛事档案', terms: ['世界杯', '巴西', '意大利', '点球', '巴乔', '决赛', '足球'], body: '1994年世界杯决赛，巴西与意大利在比赛及加时中均未进球，巴西在点球大战中以3比2获胜。巴乔罚失了意大利最后一球。\n\n比赛当地日期为1994年7月17日。中国观众看到直播时已跨入次日；本库按赛事举办地日期归档。' },
    { id: 'tao-debut', title: '唱片目录：陶喆首张同名专辑', site: '旧唱片资料库', date: '发行资料', terms: ['陶喆', '陶吉吉', 'davidtao', 'david tao', '首张', '同名专辑', '新专辑', '唱片'], body: '陶喆以首张同名专辑《David Tao》出道，发行年份为1997年。\n\n目录说明：David Tao也是艺人英文名。此条对应首张同名专辑，年份按首版发行记录；后续重印另列。' },
    { id: 'yao-draft', title: 'NBA选秀资料：姚明的状元签', site: '篮球资料库', date: '选秀年表', terms: ['姚明', 'yao', 'nba', '火箭', '选秀', '状元', '篮球', '亚洲大个子'], body: '2002年NBA选秀：休斯敦火箭以第一顺位选中姚明。' },
    { id: 'sichuan-news', title: '四川汶川发生地震', site: '新闻日期资料页', date: '2008年5月12日', terms: ['汶川', '四川', '地震', '五月十二日', '5月12日'], body: '2008年5月12日，四川汶川发生地震。' }
  ];

  // year 仅为制作核对用的事件年；未署年原件不得把它展示或用于玩家检索。
  const records = [
    { id: 'enrollment', year: '1991', title: '没有报到的那一年', author: '许昭然／另附未署名散页', source: '原目录：家信与入学材料；2008年整理副本', body: '许昭然，给父亲的信：\n\n爸，寄来的剪页收到了。《黄金时代》今年得了联合报的中篇小说奖，这句话你圈了两次，说我也能把日子过好。\n\n我十七岁，通知书是真的。我也是真的想去。可厂子的账还没完，家里总得有人留下。我先去找工作，你别再寄学费。\n\n————\n夹页，未署名：\n\n家里原来有四个人。弟弟出事以后，母亲连我的名字都不肯好好叫了。我以为少一个人，她终于会看我。她看了，却都是恨。\n\n那张通知书上写着季念真。别把它扔了。就算没有去过，也曾经有人在等这个名字去报到。\n\n————\n沈知返整理附记，2008.08.02凌晨，交接前：\n\n我把交接副本放在这份入学材料后面。最早想离开、后来一直没能离开的，是从这里开始的。\n\n我给副本留的问题是“你是谁”。以前每问一次，都盼有人来承认那些不属于我的事。现在我不想再把自己留在问题外面。', final: true, account: 'xuzhaoran' },
    { id: 'radio', year: '1994', title: '夜班交接纸背面的字', author: '江辞', source: '旧纸转录；原页未署完整日期', body: "今晚酒吧放世界杯决赛 巴西对意大利 点球还没踢完 老板把明天的班表递过来 我那一格又填上了\n\n我说好过明天休息 他让我先把桌子收了\n\n我二十岁了 还要挑他高兴的时候才敢说这句话\n\n等到直播里巴乔踢飞最后一球 老板顾着骂 我把围裙放在班表上 走了", account: 'jiangci' },
    { id: 'album', year: '1997', title: '第一张唱片', author: '阮信然', source: '酒吧排班纸背面转录', body: '二十三岁，第一次用自己的钱买新唱片。陶喆刚出的第一张同名专辑，封面上印着 DAVID TAO。不是别人不要的旧唱片。\n\n店员说我拿反了。我赶紧说了声对不起，其实塑料封膜还没拆，哪面朝上有什么关系。\n\n我把排班表夹在里面。明年或许能少上几班夜班。', account: 'ruanxinran' },
    { id: 'flowers', year: '1998', title: '三月的纸条与花', author: '沈知返', source: '私人笔记，原署1998.03.19', body: '三月十九日。上次醒来才过三天，我以为自己在慢慢好起来。\n\n今天买了一束花。纸条上还是那三个字：“你是谁？”怕纸条被风吹走，我用蓝线在花梗上绕了两圈，把折好的纸压在下面。\n\n我把花放在石榴巷405的桌上。你愿意的话，回我一个字就行。\n\n我不是在等什么好消息。我只想知道有没有人回过话。' },
    { id: 'flower-complaint', year: '1998', title: '关于花束的补记', author: '阮信然', source: '回执夹页；事情年份沿用原目录', body: '那张陶喆的唱片是去年刚出时买的。花是在过完年以后出现的，不是买唱片的那一天。\n\n石榴巷405，桌上。一根蓝线在花梗上绕了两圈，没有卡片。我翻过底下，没有写给我的字。\n\n没人撬锁不等于没人进过来。可我没有看见谁，只能说到这里。', account: 'ruanxinran' },
    { id: 'recorder', year: '2002', title: '桌下的录音装置', author: '沈知返', source: '私人笔记，原署2002.02.07', body: '纸条等不到回话。我买了一只录音装置，装在住处桌子底下。线太长，收成两个圈，接头那里用白胶布缠了一下。\n\n我想听见自己不记得的那段时间，这间屋里到底有人说过什么。\n\n并没有跟人商量。要是先告诉他，他就不会说真话了。' },
    { id: 'new-room', year: '2002', title: '新房的第一晚', author: '方行止', source: '私人草稿转录；年份按原目录', body: '二十八岁，第一次不用向别人要新房的钥匙。\n\n电视在播姚明被火箭以第一顺位选中。我没等直播结束，就去试门上的两把锁。两把都能从里面打开。\n\n桌底的监听器也搬来了。线绕成两个圈，接头还缠着白胶布。我一直以为是老板装的，从来没问。\n\n钱是我转走的，人是我杀的，房子是我自己租的。可门一有响动，我还是会醒。\n\n老板死后，原来跟着他的四个人还在。我没留新地址，也没告诉他们我搬去哪。\n\n我以为这就叫自由。\n\n方行止', account: 'fangxingzhi' },
    { id: 'asking', year: '2003', title: '问邻居', author: '沈知返', source: '私人笔记，原署2003.10.12', body: '我又搬了一次家。这回搬到外市一栋高层，房号还是405，不是石榴巷那间。\n\n我戴着帽子和墨镜，去问商户：“405的住户平时和谁来往？”没说那个人就是我。\n\n有人回答：“昨天没看见她。”\n\n我昨天做了什么？我想再问一句，最后没敢开口。' },
    { id: 'notice', year: '2003', title: '405住户提醒', author: '公寓居委会／祁向生夹记', source: '居委会纸条转抄；原署10月13日，年份沿用目录', body: '外市高层公寓405住户：\n\n昨天有戴帽子、墨镜的人在附近打听住户的来往。不知是否为您的熟人，请留意。\n\n————\n祁向生夹记：\n\n我没见过那个人。我看见“打听”两个字，就想到雁江的人。他们以前找到过一次，我不肯等第二次。\n\n提醒没有写是谁。我后来做的事，不能算在写提醒的人身上。', account: 'qixiangsheng' },
    { id: 'identity-inquiry', year: '2004', title: '去年那张报纸', author: '沈知返', source: '私人笔记，原署2004.09.21', body: '柜里翻出一捆去年的报纸，祖安村那辆车还没查清。报道提到留下的生物痕迹。\n\n也许能用这些东西查出我是谁？我想去问，带自己的样本行不行。\n\n我把问题写在纸边，怕下次又忘掉。我要找的是自己的名字，不是去找谁的家人。\n\n九月二十四日补记：没有去。我没送过样本，也没拿到过什么结果。走到门口又回来了，怕他们先问我为什么知道那辆车。' },
    { id: 'margin', year: '2004', title: '剪报的另一侧', author: '苏念慈转抄', source: '旧报为2003年；边注年份沿原保管目录', body: '剪报正文只说，车里发现了生物痕迹，来源还没确认。\n\n页边有两句话：“带自己的样本，能不能查出我是谁？”和“他们会找到母亲。”\n\n我带母亲出门以前，没有人来找过她。剪报也没有说有人在找她。第二句话没有署名，我却认定是季念真写的，还把它当成马上会发生的事。\n\n母亲问我冷不冷。我只让她再往前走一点。', account: 'sunianci' },
    { id: 'cups', year: '2008', title: '五月的照片背面', author: '苏念慈', source: '照片保管附页；原记5月12日以后', body: '新闻里是汶川地震。今天又翻到有人在等家人回来的照片。\n\n母亲的杯子还在。她走了几年，我没扔。不是怕谁回来责备，是我自己每天还要经过那个地方。\n\n照片记的是今年，不是母亲走的那一年。不要再把几年前的东西装进同一个新信封，就当它们都发生在今天。', account: 'sunianci' }
  ];

  // 入学材料另存于年份子目录，未编入散页正文索引。路径线索来自家信，
  // 不是“读满若干材料”后由系统凭空生成的附件。
  const enrollmentPacket = records[0];
  records[0] = {
    id: 'enrollment', year: '1991', title: '未寄出的家信', author: '许昭然',
    source: '家信转录；原页没有署年。附注：随附父亲寄来剪页的信封，邮戳已磨损。', account: 'xuzhaoran',
    body: enrollmentPacket.body.split('————')[0].trim().replace('通知书是真的', '录取通知书是真的'),
    directory: true
  };
  const indexedYears = { flowers: '1998', recorder: '2002', asking: '2003', 'identity-inquiry': '2004', cups: '2008' };
  for (const record of records) {
    record.indexedYear = indexedYears[record.id] || null;
    record.source = record.source.replace(/；事情年份沿用原目录|；年份按原目录|，年份沿用目录|；边注年份沿原保管目录/g, '；年份未署');
  }
  // 同一事物的两面不复述彼此的结论；保留不可靠记忆的口吻。
  records.find(r => r.id === 'flower-complaint').body = '去年刚发行的时候，我买了那张陶喆的唱片。花是过完年以后才出现在桌上的，不是买唱片那天。\n\n我回到石榴巷405时，桌上有一束花。花梗上绕着两圈蓝线，没有卡片。我把花翻过来，也没找到写给我的字。\n\n后来换锁，师傅问把手也要不要换。我说先不用，钱不够，旧把手我擦擦还能用。\n\n阮信然';
  records.find(r => r.id === 'cups').body = '新闻里在说汶川地震。照片上有人等家人回来。\n\n母亲的杯子还在柜子里。她走了好几年，我一直没扔。\n\n我刚把杯子拿出来擦干净，又和自己的杯子并排放回去。每次经过，我还是会看见它。';
  const aliases = [
    ['david tao', 'davidtao', '陶喆', '陶吉吉'], ['姚明', 'yao'],
    ['高温', '受热'], ['蜷曲', '屈曲', '拳握'], ['尸体', '死者'],
    ['姿势', '姿态'], ['低阻力', '阻力低'],
    ['年份', '年代', '哪一年'], ['门闩', '横闩'], ['录音', '监听', '窃听'],
    ['黄金时代', '黃金時代'], ['联合报', '聯合報'], ['回执', '报警', '报案'],
    ['民宿', '湖畔', '湖畔村'], ['鬼校', '闪金村'], ['焚车', '面包车'], ['报到', '入学', '录取'],
    ['首张专辑', '第一张专辑', '首张同名专辑', '同名专辑'],
    ['车祸', '车辆失控', '交通事故'], ['摄影展', '影展'], ['图录', '展览目录', '摄影图录'], ['照片', '相片', '图片'], ['署名', '摄影署名'], ['租住', '租房'], ['焚车', '焚车案', '烧车'], ['锁门', '落锁', '反锁', '关门', '锁上', '锁住', '落闩'],
  ];
  const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const plainText = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  function tokens(query) {
    let q = normalize(query).replace(/[《》“”"'？?，,：:。！!]/g, ' ');
    // 允许连写：黄金时代1991、石榴巷405、湖畔村火灾。
    // 完整地名优先于简称，避免把“湖畔村”拆成会被拒绝的单字“村”。
    // 不使用剧情状态选择搜索结果，也不忽略用户输入的实质条件。
    q = q.replace(/((?:19|20)\d{2})年?/g, ' $1 ');
    const words = [...new Set([...aliases.flat(), ...publicPages.flatMap(item => item.terms), '安南高速', '安南', '祖安村', '祖安', '雁江会所', '雁江', '旧员工', '身份更正', '死者身份', '入室放花', '档案管理员', '留下的人', '桌上多了花', '花束', '借展', '归还登记', '起火', '照片', '黄金时代', '手部', '选秀', '发行', '连载', '获奖', '石榴巷', '世界杯', '点球', '巴西', '意大利', '塞壬', '陶艺', '周济川', '起火', '死亡', '照片', '原片', '母亲'])].sort((a,b) => b.length - a.length);
    // 一次最长词匹配，避免“首张同名专辑”被后续短词再次拆坏。
    const escapedWords = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    q = q.replace(new RegExp(escapedWords.join('|'), 'g'), word => ` ${word} `);
    return [...new Set(q.split(/\s+/).filter(Boolean).filter(word => !['的', '年', '是哪', '是什么', '哪年', '哪一年', '年份', '年代', '什么时候', '时间', '资料'].includes(word)))];
  }
  function rank(items, query, year = '') {
    const parts = tokens(query);
    if (parts.some(part => part.length < 2 && !/^\d+$/.test(part) && !['花', '锁', '钱', '火'].includes(part))) return [];
    return items.map((item, index) => {
      const indexedYear = Object.hasOwn(item, 'indexedYear') ? item.indexedYear : item.year;
      // 未署年的原件不会凭制作台账被匹配或排除，留给玩家对照。
      if (year && indexedYear && String(indexedYear) !== String(year)) return null;
      const title = normalize(item.title);
      const body = normalize([item.title, item.author, indexedYear || '', item.body, ...(item.terms || [])].join(' '));
      let score = 0;
      for (const part of parts) {
        const options = aliases.find(group => group.includes(part)) || [part];
        if (!options.some(option => body.includes(option))) return null;
        score += options.some(option => title.includes(option)) ? 5 : 1;
      }
      return { item, score, index };
    }).filter(Boolean).sort((a,b) => b.score - a.score || a.index - b.index).map(row => row.item);
  }
  window.__investigation = { publicPages, records, enrollmentPacket, normalize, plainText, tokens, rank };
})();
