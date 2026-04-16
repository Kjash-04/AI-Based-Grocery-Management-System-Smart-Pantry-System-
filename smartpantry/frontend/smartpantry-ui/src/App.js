import React, { useEffect, useState } from "react";
import { api, getToken, clearToken } from "./api";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Recipes from "./pages/Recipes";
import Landing from "./pages/Landing";
import Compare from "./pages/Compare";
import ShoppingList from "./pages/ShoppingList";
import Admin from "./pages/Admin";

export default function App() {
  const [page, setPage] = useState(getToken() ? "dashboard" : "landing");
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  async function loadMe() {
    try {
      const data = await api.me();
      setMe(data);
      setError("");
    } catch (e) {
      setMe(null);
      setError(e.message);
    }
  }

  useEffect(() => {
    if (getToken()) loadMe();
  }, []);

  function goPage(nextPage) {
    setError("");
    setPage(nextPage);
  }

  function logout() {
    clearToken();
    setMe(null);
    setError("");
    setPage("landing");
  }

  const Nav = () => (
    <div className="nav">
      <div
        className="brand"
        onClick={() => goPage(getToken() ? "dashboard" : "landing")}
      >
        SmartPantry
      </div>
      {getToken() && (
        <div className="navBtns">
          <button onClick={() => goPage("dashboard")}>Dashboard</button>
          <button onClick={() => goPage("shopping")}>Shopping</button>
          <button onClick={() => goPage("compare")}>Compare</button>
          <button onClick={() => goPage("recipes")}>Recipes</button>
          {me?.role === "admin" && (
            <button onClick={() => goPage("admin")}>Admin</button>
          )}
          <button onClick={() => goPage("profile")}>Profile</button>
          <button className="danger" onClick={logout}>Logout</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      {getToken() && <Nav />}
      {error && <div className="error">{error}</div>}

      {page === "landing" && !getToken() && (
        <Landing
          goLogin={() => goPage("login")}
          goSignup={() => goPage("signup")}
        />
      )}

      {page === "login" && !getToken() && (
        <Login
          onDone={() => {
            setError("");
            loadMe();
            setPage("dashboard");
          }}
          goSignup={() => goPage("signup")}
          onError={(m) => setError(m)}
        />
      )}

      {page === "signup" && !getToken() && (
        <Signup
          onDone={() => {
            setError("");
            loadMe();
            setPage("dashboard");
          }}
          goLogin={() => goPage("login")}
          onError={(m) => setError(m)}
        />
      )}

      {page === "profile" && getToken() && (
        <Profile
          me={me}
          refresh={loadMe}
          onError={(m) => setError(m)}
        />
      )}

      {page === "dashboard" && getToken() && (
        <Dashboard onError={(m) => setError(m)} />
      )}

      {page === "shopping" && getToken() && (
        <ShoppingList onError={(m) => setError(m)} />
      )}

      {page === "compare" && getToken() && <Compare />}

      {page === "recipes" && getToken() && (
        <Recipes onError={(m) => setError(m)} />
      )}

      {page === "admin" && getToken() && me?.role === "admin" && (
        <Admin onError={(m) => setError(m)} />
      )}
    </div>
  );
}
