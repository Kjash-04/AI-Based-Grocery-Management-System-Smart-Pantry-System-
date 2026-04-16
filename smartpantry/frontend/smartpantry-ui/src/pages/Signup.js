import React, { useState } from "react";
import { api, setToken } from "../api";

export default function Signup({ onDone, goLogin, onError }) {
  const [full_name, setName] = useState("");
  const [dob, setDob] = useState("2000-01-01");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [dietary, setDietary] = useState("vegetarian");
  const [allergies, setAllergies] = useState("");
  const [household_size, setHouse] = useState(1);
  const [platforms, setPlatforms] = useState("BigBasket,Zepto");
  const [otp, setOtp] = useState("123456");

  async function submit(e) {
    e.preventDefault();
    try {
      const payload = {
        full_name,
        dob,
        mobile,
        email,
        password,
        otp,
        about: {
          dietary_preferences: dietary ? [dietary] : [],
          allergies: allergies ? allergies.split(",").map(s=>s.trim()).filter(Boolean) : [],
          household_size: Number(household_size),
          grocery_platforms: platforms ? platforms.split(",").map(s=>s.trim()).filter(Boolean) : []
        }
      };
      const res = await api.signup(payload);
      setToken(res.token);
      onDone();
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Sign Up</h2>
      <form onSubmit={submit}>
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
            <label>Email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
        </div>

        <label>Password</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />

        <h3 style={{marginTop:14}}>About You</h3>
        <div className="row">
          <div>
            <label>Dietary Preference</label>
            <select value={dietary} onChange={(e)=>setDietary(e.target.value)}>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="">None</option>
            </select>
          </div>
          <div>
            <label>Household Size</label>
            <input type="number" value={household_size} onChange={(e)=>setHouse(e.target.value)} />
          </div>
        </div>

        <label>Allergies (comma separated)</label>
        <input value={allergies} onChange={(e)=>setAllergies(e.target.value)} />

        <label>Grocery Platforms (comma separated)</label>
        <input value={platforms} onChange={(e)=>setPlatforms(e.target.value)} />

        <label>OTP (demo: 123456)</label>
        <input value={otp} onChange={(e)=>setOtp(e.target.value)} />

        <div style={{marginTop:10, display:"flex", gap:"10px", flexWrap:"wrap"}}>
          <button className="primary" type="submit">Create Account</button>
          <button className="secondaryBtn" type="button" onClick={goLogin}>Back to login</button>
        </div>
      </form>
    </div>
  );
}
