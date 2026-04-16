import React, { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onDone, goSignup, onError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      onDone();
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <label>Email</label>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <div style={{marginTop:10, display:"flex", gap:"10px", flexWrap:"wrap"}}>
          <button className="primary" type="submit">Login</button>
          <button className="secondaryBtn" type="button" onClick={goSignup}>Create account</button>
        </div>
      </form>
      <p className="small">Demo OTP for signup: <b>123456</b></p>
    </div>
  );
}
