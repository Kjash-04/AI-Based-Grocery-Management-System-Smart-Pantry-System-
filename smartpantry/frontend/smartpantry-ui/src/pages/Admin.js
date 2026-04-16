import React, { useEffect, useState } from "react";
import { api } from "../api";

function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

export default function Admin({ onError }) {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [savingUserId, setSavingUserId] = useState("");

  async function load() {
    try {
      const [summaryData, usersData] = await Promise.all([
        api.getAdminSummary(),
        api.listAdminUsers(),
      ]);
      setSummary(summaryData);
      setUsers(usersData);
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(userId, role) {
    try {
      setSavingUserId(userId);
      await api.updateAdminUserRole(userId, { role });
      await load();
      onError("");
    } catch (e) {
      onError(e.message);
    } finally {
      setSavingUserId("");
    }
  }

  return (
    <div className="dashboardPage">
      <section className="dashboardHero adminHero">
        <div className="dashboardHeroContent">
          <span className="eyebrow">Admin control</span>
          <h1>Monitor users, stock activity, and access levels.</h1>
          <p>
            This workspace gives admins a quick operating view of SmartPantry:
            who signed up, how much inventory is tracked, and who can access
            admin tools.
          </p>
        </div>

        <div className="dashboardHeroAside">
          <div className="spotlightCard adminSpotlight">
            <div className="spotlightHeader">
              <span>Admin coverage</span>
              <strong>{summary?.total_admins ?? 0}</strong>
            </div>
            <div className="progressTrack">
              <div
                className="progressFill"
                style={{
                  width: `${
                    summary?.total_users
                      ? Math.max(
                          8,
                          Math.round(
                            (summary.total_admins / summary.total_users) * 100
                          )
                        )
                      : 8
                  }%`,
                }}
              />
            </div>
            <p>
              {summary?.total_users
                ? `${summary.total_users} registered user(s) across the platform.`
                : "No registered users yet."}
            </p>
          </div>
        </div>
      </section>

      <section className="statsGrid">
        <article className="metricCard accentLeaf">
          <span className="metricLabel">Users</span>
          <strong className="metricValue">{summary?.total_users ?? 0}</strong>
          <p>Accounts currently registered in SmartPantry.</p>
        </article>
        <article className="metricCard accentAmber">
          <span className="metricLabel">Admins</span>
          <strong className="metricValue">{summary?.total_admins ?? 0}</strong>
          <p>Users with access to admin-only controls.</p>
        </article>
        <article className="metricCard accentSlate">
          <span className="metricLabel">Inventory rows</span>
          <strong className="metricValue">
            {summary?.total_inventory_items ?? 0}
          </strong>
          <p>Total pantry records stored across all users.</p>
        </article>
        <article className="metricCard accentBlue">
          <span className="metricLabel">Shopping rows</span>
          <strong className="metricValue">
            {summary?.total_shopping_items ?? 0}
          </strong>
          <p>Tracked shopping list entries across the platform.</p>
        </article>
      </section>

      <section className="dashboardMainGrid">
        <div className="dashboardPrimaryColumn">
          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">User directory</span>
                <h2>Manage account roles</h2>
              </div>
              <button className="secondaryBtn" onClick={load}>
                Refresh
              </button>
            </div>

            <div className="inventoryList">
              {users.length ? (
                users.map((user) => (
                  <div className="inventoryRowCard adminUserRow" key={user.id}>
                    <div className="inventoryRowMain">
                      <div className="inventoryAvatar">
                        {user.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="inventoryTitleRow">
                          <strong>{user.full_name}</strong>
                          <span className="badge">{user.role}</span>
                        </div>
                        <p>{user.email}</p>
                      </div>
                    </div>

                    <div className="inventoryMeta">
                      <span className="statusChip mutedChip">
                        Inventory {user.inventory_count}
                      </span>
                      <span className="statusChip mutedChip">
                        Shopping {user.shopping_list_count}
                      </span>
                      <span className="inventoryDate">
                        Joined {formatDate(user.created_at)}
                      </span>
                    </div>

                    <div className="inventoryActionStack">
                      <button
                        className="secondaryBtn"
                        onClick={() =>
                          changeRole(
                            user.id,
                            user.role === "admin" ? "user" : "admin"
                          )
                        }
                        disabled={savingUserId === user.id}
                      >
                        {savingUserId === user.id
                          ? "Saving..."
                          : user.role === "admin"
                            ? "Make User"
                            : "Make Admin"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="emptyStateCard">
                  <strong>No users found.</strong>
                  <p>User accounts will appear here after signup.</p>
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="dashboardSidebar">
          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Recent signups</span>
                <h2>Newest accounts</h2>
              </div>
            </div>

            <div className="activityList">
              {summary?.recent_users?.length ? (
                summary.recent_users.map((user) => (
                  <div className="activityItem" key={user.id}>
                    <div>
                      <strong>{user.full_name}</strong>
                      <p>{user.email}</p>
                    </div>
                    <span className="statusChip mutedChip">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="small">Recent signups will appear here.</p>
              )}
            </div>
          </article>

          <article className="panelCard utilityPanel">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Bootstrap note</span>
                <h2>Who becomes admin?</h2>
              </div>
            </div>
            <p className="panelHint">
              The first account created becomes an admin automatically. You can
              also pre-assign admins by setting the <code>ADMIN_EMAILS</code>
              environment variable to a comma-separated list of email
              addresses.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
