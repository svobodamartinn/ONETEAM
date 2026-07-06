
import React, {useMemo, useState} from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const initialUsers = [
  {id:1, name:"Team Leader", username:"leader", password:"demo123", role:"leader"},
  {id:2, name:"Petr Obchodník", username:"obchodnik", password:"demo123", role:"seller"},
  {id:3, name:"Vedení", username:"management", password:"demo123", role:"management"},
];

const initialOrders = [
  {id:1, owner_id:2, order_number:"2026-1001", customer_name:"Jan Novák", phone:"777123456", customer_type:"RČ", deal_type:"O2 Spolu", product_group:"Postpaid", tariff:"NEO+ Zlatý", status:"V realizaci", final_commission:1200},
  {id:2, owner_id:2, order_number:"2026-1002", customer_name:"Petr Dvořák", phone:"777888999", customer_type:"IČO", deal_type:"O2 Profi", product_group:"PRO", tariff:"O2 Internet MAX Pro 100", status:"Čekám na OKU", final_commission:1360},
  {id:3, owner_id:2, order_number:"2026-1003", customer_name:"Martin Král", phone:"777555222", customer_type:"RČ", deal_type:"Bez Spolu", product_group:"TV", tariff:"Oneplay Komfort", status:"Dokončeno", final_commission:700},
];

function useStore(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || initial; }
    catch { return initial; }
  });
  const save = (v) => {
    setValue(v);
    localStorage.setItem(key, JSON.stringify(v));
  };
  return [value, save];
}

function calcCommission(data) {
  let base = Number(data.base_commission || 1600);
  if (data.deal_type === "O2 Spolu") base = 1200;
  const profi = Number(data.profi_percent || 0);
  const d1 = Number(data.discount1 || 0);
  const d2 = Number(data.discount2 || 0);
  const hwb = Number(data.hwb_amount || 0);
  const lco = Number(data.lco_amount || 0);
  const hwbImpact = hwb ? -(hwb / 1.21 / 24 * 3) : 0;
  const lcoImpact = lco ? -(lco * 3) : 0;
  return Math.round(base * (1 - profi) + d1 + d2 + hwbImpact + lcoImpact);
}

function Badge({status}) {
  const cls = status === "Dokončeno" ? "green" : status === "V realizaci" ? "orange" : status === "Čekám na OKU" ? "yellow" : status === "Storno" ? "black" : "red";
  return <span className={"badge " + cls}>{status}</span>
}

function App() {
  const [users, setUsers] = useStore("oneteam_users", initialUsers);
  const [orders, setOrders] = useStore("oneteam_orders", initialOrders);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loginError, setLoginError] = useState("");

  const visibleOrders = useMemo(() => {
    if (!user) return [];
    if (user.role === "seller") return orders.filter(o => o.owner_id === user.id);
    return orders;
  }, [user, orders]);

  const dashboard = useMemo(() => {
    const rows = visibleOrders;
    return {
      total: rows.length,
      done: rows.filter(o => o.status === "Dokončeno").length,
      storno: rows.filter(o => o.status === "Storno").length,
      ga: rows.filter(o => o.product_group !== "HW" && o.status !== "Storno").length,
      hwdev: rows.filter(o => o.product_group === "HW" && o.status !== "Storno").length,
      commission: rows.filter(o => o.status !== "Storno").reduce((s,o) => s + Number(o.final_commission || 0), 0),
    }
  }, [visibleOrders]);

  const login = () => {
    const u = users.find(x => x.username === document.getElementById("username").value.trim() && x.password === document.getElementById("password").value);
    if (!u) return setLoginError("Špatné jméno nebo heslo");
    setUser(u);
    setPage(u.role === "leader" ? "teamDashboard" : "dashboard");
  };

  const updateStatus = (id, status) => {
    setOrders(orders.map(o => o.id === id ? {...o, status} : o));
  };

  const createOrder = () => {
    const required = ["order_number", "customer_name", "phone"];
    let data = Object.fromEntries(new FormData(document.getElementById("orderForm")).entries());
    let missing = required.filter(k => !data[k]);
    if (missing.length) return alert("Vyplň povinná pole: číslo objednávky, zákazník, telefon.");
    const order = {
      id: Date.now(),
      owner_id: user.id,
      ...data,
      final_commission: calcCommission(data)
    };
    setOrders([order, ...orders]);
    setPage("orders");
  };

  const resetData = () => {
    localStorage.clear();
    location.reload();
  };

  if (!user) {
    return <section className="login">
      <div className="login-card">
        <div className="brand">MB Sales</div>
        <h1>OneTeam</h1>
        <p>Jeden tým. Jeden cíl.</p>
        <label>Uživatelské jméno</label>
        <input id="username" defaultValue="leader" />
        <label>Heslo</label>
        <input id="password" type="password" defaultValue="demo123" />
        <button className="btn full" onClick={login}>Přihlásit se</button>
        <p className="errorText">{loginError}</p>
        <small>Demo účty: leader / obchodnik / management, heslo demo123</small>
      </div>
      <div className="hero">
        <h2>OneTeam CRM</h2>
        <p>Online verze připravená pro Vercel.</p>
      </div>
    </section>
  }

  const nav = [
    ["dashboard","🏠 Dashboard"],
    ...(user.role === "leader" ? [["teamDashboard","📈 Týmový Dashboard"]] : []),
    ["orders","📄 Moje objednávky"],
    ["newOrder","➕ Nová objednávka"],
    ...(user.role !== "seller" ? [["team","👥 Tým"],["management","🏢 Management"]] : []),
    ["export","📤 Export Builder"],
  ];

  return <div className="app">
    <aside className="side">
      <div className="logo">MB Sales</div>
      <div className="sub">OneTeam Online</div>
      <div className="roleBox">{user.name}<br/><small>{user.role}</small></div>
      <nav>{nav.map(([id,label]) => <button key={id} className={page===id ? "active" : ""} onClick={()=>setPage(id)}>{label}</button>)}</nav>
      <button className="ghost" onClick={()=>setUser(null)}>Odhlásit</button>
    </aside>

    <main className="main">
      <div className="top">
        <div>
          <h1>{nav.find(x => x[0]===page)?.[1].replace(/[^\wěščřžýáíéúůóĚŠČŘŽÝÁÍÉÚŮÓ ]/g,"") || "OneTeam"}</h1>
          <p>Přepínání Den / Týden / Měsíc je připravené pro další napojení na databázi.</p>
        </div>
        <div className="period"><button>◀</button><strong>Dnes</strong><button>▶</button><button className="on">Den</button><button>Týden</button><button>Měsíc</button></div>
      </div>

      {page === "dashboard" && <Dashboard dashboard={dashboard} />}
      {page === "teamDashboard" && <TeamDashboard users={users} orders={orders} />}
      {page === "orders" && <Orders rows={visibleOrders} updateStatus={updateStatus} />}
      {page === "newOrder" && <NewOrder createOrder={createOrder} />}
      {page === "team" && <Team users={users} setUsers={setUsers} orders={orders} />}
      {page === "management" && <Management />}
      {page === "export" && <Export rows={visibleOrders} resetData={resetData} />}
    </main>
  </div>
}

function Dashboard({dashboard}) {
  return <div className="cards">
    <Card title="Objednávky" value={dashboard.total}/>
    <Card title="Dokončeno" value={dashboard.done}/>
    <Card title="Storno" value={dashboard.storno}/>
    <Card title="GA" value={dashboard.ga}/>
    <Card title="HW/DEV" value={dashboard.hwdev}/>
    <Card title="Výdělek" value={dashboard.commission + " Kč"}/>
    <Card title="Schůzky" value="8"/>
    <Card title="Zrušeno" value="2"/>
  </div>
}

function TeamDashboard({users, orders}) {
  const sellers = users.filter(u => u.role !== "management");
  return <>
    <div className="cards">
      <Card title="Schůzky týmu dnes" value="32"/>
      <Card title="Proběhlo" value="24"/>
      <Card title="Zrušeno" value="8"/>
      <Card title="GA týmu" value={orders.filter(o=>o.product_group!=="HW" && o.status!=="Storno").length}/>
      <Card title="Denní výdělek týmu" value={orders.filter(o=>o.status!=="Storno").reduce((s,o)=>s+o.final_commission,0)+" Kč"}/>
    </div>
    <table className="table"><thead><tr><th>Obchodník</th><th>Objednávky</th><th>Denní výdělek</th><th>Konverze</th></tr></thead><tbody>
      {sellers.map(u => {
        const rows = orders.filter(o => o.owner_id === u.id && o.status !== "Storno");
        return <tr key={u.id}><td>{u.name}</td><td>{rows.length}</td><td><strong>{rows.reduce((s,o)=>s+o.final_commission,0)} Kč</strong></td><td>{u.role==="leader" ? "75 %" : "62 %"}</td></tr>
      })}
    </tbody></table>
  </>
}

function Orders({rows, updateStatus}) {
  return <table className="table"><thead><tr><th>Číslo</th><th>Zákazník</th><th>Typ</th><th>Režim</th><th>Produkt</th><th>Tarif</th><th>Stav</th><th>Provize</th><th>Změnit</th></tr></thead><tbody>
    {rows.map(r => <tr key={r.id}><td>{r.order_number}</td><td>{r.customer_name}</td><td>{r.customer_type}</td><td>{r.deal_type}</td><td>{r.product_group}</td><td>{r.tariff}</td><td><Badge status={r.status}/></td><td>{r.final_commission} Kč</td><td><select value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}><option>Uloženo</option><option>Čekám na OKU</option><option>V realizaci</option><option>Dokončeno</option><option>Storno</option></select></td></tr>)}
  </tbody></table>
}

function NewOrder({createOrder}) {
  const [ctype,setCtype]=useState("RČ");
  const [deal,setDeal]=useState("Bez Spolu");
  return <div className="form">
    <form id="orderForm">
      <div className="grid">
        <Field name="order_number" label="Číslo objednávky *"/>
        <div><label>RČ / IČO</label><select name="customer_type" value={ctype} onChange={e=>{setCtype(e.target.value); if(e.target.value==="RČ" && deal==="O2 Profi") setDeal("Bez Spolu")}}><option>RČ</option><option>IČO</option></select></div>
        <Field name="customer_name" label="Jméno zákazníka *"/>
        <Field name="phone" label="Telefon *"/>
        <div><label>Typ zadání</label><select name="deal_type" value={deal} onChange={e=>setDeal(e.target.value)}><option>Bez Spolu</option><option>O2 Spolu</option>{ctype==="IČO" && <option>O2 Profi</option>}</select></div>
        <div><label>Produkt</label><select name="product_group"><option>Postpaid</option><option>PRO</option><option>FBB</option><option>TV</option><option>HW</option></select></div>
        <Field name="tariff" label="Tarif" defaultValue="NEO+ Zlatý"/>
        <div><label>Status</label><select name="status"><option>Uloženo</option><option>Čekám na OKU</option><option>V realizaci</option><option>Dokončeno</option><option>Storno</option></select></div>
      </div>
      {deal === "O2 Profi" && <div className="box">
        <h3>O2 Profi</h3>
        <div className="grid">
          <div><label>Profi %</label><select name="profi_percent"><option value="0">0%</option><option value="0.1">10%</option><option value="0.2">20%</option><option value="0.3">30%</option></select></div>
          <Field name="hwb_amount" label="HWB" type="number" defaultValue="0"/>
          <Field name="lco_amount" label="LCO/kredit" type="number" defaultValue="0"/>
        </div>
      </div>}
    </form>
    <button className="btn" onClick={createOrder}>Uložit objednávku</button>
  </div>
}

function Team({users,setUsers,orders}) {
  const add = () => {
    const name = prompt("Jméno obchodníka:");
    if (!name) return;
    const username = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replaceAll(" ",".");
    setUsers([...users, {id:Date.now(), name, username, password:"Start123", role:"seller"}]);
    alert("Vytvořen účet: " + username + " / Start123");
  }
  return <>
    <button className="btn" onClick={add}>+ Přidat obchodníka</button>
    <table className="table"><thead><tr><th>Jméno</th><th>Login</th><th>Role</th><th>Objednávky</th><th>Výdělek</th><th>Akce</th></tr></thead><tbody>
      {users.filter(u=>u.role!=="management").map(u => {
        const rows = orders.filter(o=>o.owner_id===u.id && o.status!=="Storno");
        return <tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td>{u.role}</td><td>{rows.length}</td><td>{rows.reduce((s,o)=>s+o.final_commission,0)} Kč</td><td><button onClick={()=>alert("Nové heslo: Start123")}>Reset hesla</button></td></tr>
      })}
    </tbody></table>
  </>
}

function Management() {
  return <>
    <div className="cards">
      <Card title="Domluveno od CC" value="687"/>
      <Card title="Proběhlo" value="372"/>
      <Card title="Přesunuto" value="39"/>
      <Card title="Zrušeno" value="231"/>
      <Card title="Vlastní" value="45"/>
      <Card title="Zrušeno CC%" value="33,6 %"/>
    </div>
    <table className="table"><thead><tr><th>Obchodník</th><th>Domluveno od CC</th><th>Proběhlo</th><th>Přesunuto</th><th>Zrušeno</th><th>Vlastní</th><th>Zrušeno CC%</th><th>Navolaných KO</th><th>Dovolaných KO</th><th>Cíl KO</th><th>Vlastní/GA</th></tr></thead><tbody>
      <tr><td>Jan Novák</td><td>80</td><td>42</td><td>0</td><td>34</td><td>6</td><td>43%</td><td>8</td><td>6</td><td>204</td><td>9</td></tr>
      <tr><td>Petr Svoboda</td><td>27</td><td>19</td><td>1</td><td>11</td><td>4</td><td>41%</td><td>17</td><td>14</td><td>66</td><td>5</td></tr>
    </tbody></table>
  </>
}

function Export({rows,resetData}) {
  const csv = "data:text/csv;charset=utf-8," + encodeURIComponent("cislo,zakaznik,typ,rezim,produkt,tarif,stav,provize\n" + rows.map(r => [r.order_number,r.customer_name,r.customer_type,r.deal_type,r.product_group,r.tariff,r.status,r.final_commission].join(",")).join("\n"));
  return <div className="form">
    <h2>Export Builder</h2>
    <p>První online verze exportuje objednávky podle role.</p>
    <a className="btn" href={csv} download="oneteam_orders.csv">Stáhnout CSV</a>
    <button className="btn danger" onClick={resetData}>Resetovat demo data</button>
  </div>
}

function Field({name,label,type="text",defaultValue=""}) {
  return <div><label>{label}</label><input name={name} type={type} defaultValue={defaultValue}/></div>
}

function Card({title,value}) { return <div className="card"><h3>{title}</h3><div className="big">{value}</div></div> }

createRoot(document.getElementById("root")).render(<App />);
