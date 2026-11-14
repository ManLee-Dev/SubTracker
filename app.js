"use strict";

const TPL = [
  ["Netflix", "#E50914", 260000, "m"],
  ["Spotify", "#1DB954", 59000, "m"],
  ["Adobe", "#FA0F00", 349000, "m"],
  ["iCloud", "#3693F3", 19000, "m"],
  ["ChatGPT", "#10A37F", 520000, "m"],
  ["YouTube Premium", "#FF0000", 79000, "m"],
  ["Canva", "#00A9B4", 1499000, "y"],
  ["Google One", "#4285F4", 489000, "y"],
];
const KEY = "radar-gia-han-v1";
const DAY = 864e5;

let off = 0;
let state = load();
let selTpl = null;

function dstr(date) {
  return date.toISOString().slice(0, 10);
}

function base() {
  const date = new Date();
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function now() {
  return base() + off * DAY;
}

function plus(days) {
  return dstr(new Date(base() + days * DAY));
}

function seed() {
  return {
    subs: [
      { id: 1, name: "Netflix", color: "#E50914", price: 260000, cycle: "m", due: plus(2), src: "Thẻ Techcombank", trial: false },
      { id: 2, name: "Spotify", color: "#1DB954", price: 59000, cycle: "m", due: plus(5), src: "Ví MoMo", trial: false },
      { id: 3, name: "Adobe", color: "#FA0F00", price: 349000, cycle: "m", due: plus(4), src: "Thẻ Visa", trial: true },
      { id: 4, name: "iCloud", color: "#3693F3", price: 19000, cycle: "m", due: plus(3), src: "Apple ID", trial: false },
      { id: 5, name: "ChatGPT", color: "#10A37F", price: 520000, cycle: "m", due: plus(9), src: "Thẻ Visa", trial: false },
      { id: 6, name: "YouTube Premium", color: "#FF0000", price: 79000, cycle: "m", due: plus(1), src: "Google Play", trial: false },
      { id: 7, name: "Canva", color: "#00A9B4", price: 1499000, cycle: "y", due: plus(20), src: "Thẻ Techcombank", trial: false },
    ],
    archive: [{ name: "Disney+ Hotstar", price: 79000, cycle: "m", on: plus(-12) }],
    log: [],
    sent: {},
  };
}

function load() {
  try {
    const savedState = localStorage.getItem(KEY);
    if (savedState) return JSON.parse(savedState);
  } catch (error) {
    console.warn("Không thể đọc dữ liệu đã lưu; sử dụng dữ liệu mẫu.", error);
  }
  return seed();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Không thể lưu dữ liệu theo dõi gói đăng ký.", error);
    toast("Không thể lưu dữ liệu. Kiểm tra dung lượng hoặc cài đặt trình duyệt.");
  }
}

const vnd = (amount) => Math.round(amount).toLocaleString("vi-VN") + "đ";
const fdate = (date) => date.split("-").reverse().join("/");

function addPeriod(date, cycle) {
  const [year, month, day] = date.split("-").map(Number);
  const next = cycle === "y"
    ? new Date(Date.UTC(year + 1, month - 1, 1))
    : new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return dstr(next);
}

const daysLeft = (date) => Math.round((Date.parse(date) - now()) / DAY);
const monthly = (subscription) => subscription.cycle === "y" ? subscription.price / 12 : subscription.price;

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => element.classList.remove("show"), 3200);
}

const $ = (id) => document.getElementById(id);

function channels() {
  return [...document.querySelectorAll("#channels input:checked")].map((input) => input.value);
}

function remind(silent) {
  const selectedChannels = channels();
  let count = 0;

  state.subs.forEach((subscription) => {
    const remaining = daysLeft(subscription.due);
    if (![3, 1, 0].includes(remaining)) return;

    const reminderKey = subscription.id + "|" + subscription.due + "|" + remaining;
    if (state.sent[reminderKey]) return;

    state.sent[reminderKey] = 1;
    count++;
    const timing = remaining === 0 ? "hôm nay" : "còn " + remaining + " ngày nữa";
    const message = (subscription.trial ? "Gói dùng thử " : "Gói ")
      + subscription.name + " " + timing + " sẽ trừ " + vnd(subscription.price)
      + " từ " + subscription.src + ". Giữ hay hủy?";
    state.log.unshift({
      t: fdate(dstr(new Date(now()))),
      ch: selectedChannels.length ? selectedChannels.join(" · ") : "Chưa bật kênh nào",
      body: message,
    });
  });

  state.log = state.log.slice(0, 30);
  if (count && !silent) toast("Đã gửi " + count + " nhắc hạn mới");
  persist();
}

function render() {
  $("today").textContent = fdate(dstr(new Date(now())));
  const subscriptions = [...state.subs].sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
  const upcoming = subscriptions.filter((subscription) => daysLeft(subscription.due) <= 30);
  const upcomingTotal = upcoming.reduce((total, subscription) => total + subscription.price, 0);

  $("next30").textContent = vnd(upcomingTotal);
  $("next30sub").textContent = upcoming.length
    ? upcoming.length + " khoản trong 30 ngày tới. Khoản gần nhất: "
      + upcoming[0].name + " (" + vnd(upcoming[0].price) + ")."
    : "Không có khoản nào sắp đến hạn.";

  const monthlyTotal = state.subs.reduce((total, subscription) => total + monthly(subscription), 0);
  $("month").textContent = vnd(monthlyTotal);
  $("year").textContent = vnd(monthlyTotal * 12);
  $("saved").textContent = vnd(state.archive.reduce(
    (total, item) => total + (item.cycle === "y" ? item.price : item.price * 12),
    0,
  )) + "/năm";

  renderSubscriptions(subscriptions);
  renderReminders();
  renderArchive();
}

function renderSubscriptions(subscriptions) {
  const list = $("list");
  list.innerHTML = "";

  if (!subscriptions.length) {
    list.innerHTML = '<div class="empty">Chưa có gói nào. Bấm “Thêm dịch vụ” để bắt đầu theo dõi.</div>';
    return;
  }

  subscriptions.forEach((subscription) => {
    const remaining = daysLeft(subscription.due);
    let tagClass = "t-ok";
    let tagText = "Còn " + remaining + " ngày nữa trừ " + vnd(subscription.price);

    if (remaining < 0) {
      tagClass = "t-hot";
      tagText = "Đã qua hạn " + (-remaining) + " ngày: " + vnd(subscription.price) + " có thể đã bị trừ";
    } else if (remaining === 0) {
      tagClass = "t-hot";
      tagText = "Hôm nay trừ " + vnd(subscription.price);
    } else if (remaining <= 3) {
      tagClass = "t-hot";
    } else if (remaining <= 7) {
      tagClass = "t-warn";
    }

    const card = document.createElement("div");
    card.className = "card" + (remaining <= 1 ? " hot" : "");
    card.innerHTML = `
      <div class="logo" style="background:${subscription.color}"></div>
      <div>
        <div class="name"></div>
        <div class="meta"></div>
        <span class="tag ${tagClass}"></span>
      </div>
      <div class="price"></div>
      <div class="acts">
        <button class="renew">Đã gia hạn</button>
        <button class="cancel">Đã hủy gói</button>
      </div>`;

    card.querySelector(".logo").textContent = subscription.name[0];
    const name = card.querySelector(".name");
    name.textContent = subscription.name;

    if (subscription.trial) {
      const trialTag = document.createElement("span");
      trialTag.className = "tag t-trial";
      trialTag.textContent = "Dùng thử";
      name.append(" ", trialTag);
    }

    card.querySelector(".meta").textContent =
      (subscription.cycle === "y" ? "Hàng năm" : "Hàng tháng")
      + " · " + fdate(subscription.due) + " · " + subscription.src;
    card.querySelector(".tag").textContent = tagText;
    card.querySelector(".price").textContent = vnd(subscription.price);

    card.querySelector(".renew").onclick = () => {
      let nextDue = addPeriod(subscription.due, subscription.cycle);
      while (Date.parse(nextDue) <= now()) {
        nextDue = addPeriod(nextDue, subscription.cycle);
      }
      subscription.due = nextDue;
      subscription.trial = false;
      persist();
      render();
      toast(subscription.name + ": lịch mới " + fdate(nextDue));
    };

    card.querySelector(".cancel").onclick = () => {
      state.subs = state.subs.filter((item) => item.id !== subscription.id);
      state.archive.unshift({
        name: subscription.name,
        price: subscription.price,
        cycle: subscription.cycle,
        on: dstr(new Date(now())),
      });
      persist();
      render();
      toast("Đã hủy " + subscription.name + ". Tiết kiệm "
        + vnd(subscription.cycle === "y" ? subscription.price : subscription.price * 12) + "/năm");
    };

    list.append(card);
  });
}

function renderReminders() {
  const log = $("log");
  log.innerHTML = "";

  if (!state.log.length) {
    log.innerHTML = '<div class="meta">Chưa có thông báo nào.</div>';
  }

  state.log.forEach((message) => {
    const entry = document.createElement("div");
    entry.className = "msg";
    const date = document.createElement("i");
    date.textContent = message.t + " · " + message.ch;
    entry.append(date, message.body);
    log.append(entry);
  });
}

function renderArchive() {
  const archive = $("arch");
  archive.innerHTML = "";

  if (!state.archive.length) {
    archive.innerHTML = '<div class="meta">Chưa hủy gói nào.</div>';
  }

  state.archive.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "arch";
    const name = document.createElement("span");
    name.textContent = item.name + " · hủy " + fdate(item.on);
    const savings = document.createElement("b");
    savings.textContent = "+" + vnd(item.cycle === "y" ? item.price : item.price * 12) + "/năm";
    entry.append(name, savings);
    archive.append(entry);
  });
}

function renderTemplates() {
  const templates = $("tpls");

  TPL.forEach((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tpl";
    button.innerHTML = '<span class="logo" style="background:' + template[1] + '"></span>';
    button.querySelector(".logo").textContent = template[0][0];
    button.append(template[0]);
    button.onclick = () => {
      selTpl = template;
      templates.querySelectorAll(".tpl").forEach((item) => item.classList.remove("on"));
      button.classList.add("on");
      $("fName").value = template[0];
      $("fPrice").value = template[2];
      $("fCycle").value = template[3];
    };
    templates.append(button);
  });
}

document.querySelectorAll(".sim [data-d]").forEach((button) => {
  button.onclick = () => {
    const days = Number(button.dataset.d);
    off = days === 0 ? 0 : off + days;
    remind();
    render();
  };
});

$("reset").onclick = () => {
  state = seed();
  off = 0;
  remind(true);
  render();
  toast("Đã đặt lại dữ liệu mẫu");
};

$("channels").onchange = () => {
  toast("Kênh nhắc: " + (channels().join(", ") || "chưa bật kênh nào"));
};

renderTemplates();

$("add").onclick = () => {
  selTpl = null;
  $("tpls").querySelectorAll(".tpl").forEach((button) => button.classList.remove("on"));
  ["fName", "fPrice"].forEach((id) => { $(id).value = ""; });
  $("fDate").value = dstr(new Date(now() + 7 * DAY));
  $("fTrial").checked = false;
  $("dlg").showModal();
};

$("cancelDlg").onclick = () => $("dlg").close();

$("save").onclick = () => {
  const name = $("fName").value.trim();
  const price = +$("fPrice").value;
  const date = $("fDate").value;

  if (!name || !(price > 0) || !date) {
    toast("Nhập tên, giá lớn hơn 0 và ngày gia hạn");
    return;
  }

  state.subs.push({
    id: Date.now(),
    name,
    color: selTpl ? selTpl[1] : "#5d6a85",
    price,
    cycle: $("fCycle").value,
    due: date,
    src: $("fSrc").value,
    trial: $("fTrial").checked,
  });
  persist();
  $("dlg").close();
  remind();
  render();
  toast("Đã thêm " + name);
};

remind(true);
render();
