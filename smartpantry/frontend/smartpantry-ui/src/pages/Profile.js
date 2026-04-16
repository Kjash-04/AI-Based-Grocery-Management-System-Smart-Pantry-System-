import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Profile({ me, refresh, onError }) {
  const [full_name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [dietary, setDietary] = useState("vegetarian");
  const [allergies, setAllergies] = useState("");
  const [household_size, setHouse] = useState(1);
  const [platforms, setPlatforms] = useState("");

  useEffect(() => {
    if (!me) return;
    setName(me.full_name || "");
    setMobile(me.mobile || "");
    setDob(me.dob || "2000-01-01");
    setDietary((me.about?.dietary_preferences?.[0]) || "");
    setAllergies((me.about?.allergies || []).join(", "));
    setHouse(me.about?.household_size || 1);
    setPlatforms((me.about?.grocery_platforms || []).join(", "));
  }, [me]);

  async function save() {
    try {
      await api.updateMe({
        full_name,
        mobile,
        dob,
        about: {
          dietary_preferences: dietary ? [dietary] : [],
          allergies: allergies ? allergies.split(",").map(s=>s.trim()).filter(Boolean) : [],
          household_size: Number(household_size),
          grocery_platforms: platforms ? platforms.split(",").map(s=>s.trim()).filter(Boolean) : []
        }
      });
      await refresh();
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="card">
      <h2>Profile</h2>
      <div className="selectedItemBox" style={{ marginTop: 16 }}>
        Account role <strong>{me?.role || "user"}</strong>
      </div>
      <div className="row">
        <div>
          <label>Full Name</label>
          <input value={full_name} onChange={(e)=>setName(e.target.value)} />
        </div>
        <div>
          <label>Date of Birth</label>
          <input type="date" value={dob} onChange={(e)=>setDob(e.target.value)} />
        </div>
      </div>

      <div className="row">
        <div>
          <label>Mobile</label>
          <input value={mobile} onChange={(e)=>setMobile(e.target.value)} />
        </div>
        <div>
          <label>Dietary Preference</label>
          <select value={dietary} onChange={(e)=>setDietary(e.target.value)}>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="keto">Keto</option>
            <option value="">None</option>
          </select>
        </div>
      </div>

      <label>Allergies (comma separated)</label>
      <input value={allergies} onChange={(e)=>setAllergies(e.target.value)} />

      <label>Household Size</label>
      <input type="number" value={household_size} onChange={(e)=>setHouse(e.target.value)} />

      <label>Grocery Platforms (comma separated)</label>
      <input value={platforms} onChange={(e)=>setPlatforms(e.target.value)} />

      <div style={{marginTop:10}}>
        <button className="primary" onClick={save}>Save</button>
      </div>
    </div>
  );
}
