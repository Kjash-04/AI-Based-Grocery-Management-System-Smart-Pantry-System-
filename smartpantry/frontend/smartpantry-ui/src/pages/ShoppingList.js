import React, { useEffect, useState } from "react";
import { api } from "../api";

const starterSuggestions = [
  { name: "Milk", quantity: 2, unit: "L" },
  { name: "Eggs", quantity: 12, unit: "pcs" },
  { name: "Tomato", quantity: 1, unit: "kg" },
  { name: "Bread", quantity: 1, unit: "pack" },
];

export default function ShoppingList({ onError }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [notes, setNotes] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [statusMessage, setStatusMessage] = useState("");

  function resetForm() {
    setName("");
    setQuantity(1);
    setUnit("pcs");
    setNotes("");
    setEditingItemId(null);
  }

  async function load() {
    try {
      const data = await api.listShoppingItems();
      setItems(data);
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitItem() {
    try {
      if (!name.trim()) return;
      const payload = {
        name,
        quantity: Number(quantity),
        unit,
        notes,
      };

      if (editingItemId) {
        await api.updateShoppingItem(editingItemId, payload);
        setStatusMessage("Saved your shopping item changes.");
      } else {
        const result = await api.addShoppingItem(payload);
        setStatusMessage(
          result.action === "merged"
            ? "Updated existing item quantity."
            : "Added a new shopping item."
        );
      }

      resetForm();
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function toggleBought(item) {
    try {
      await api.updateShoppingItem(item.id, { bought: !item.bought });
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function removeItem(id) {
    try {
      await api.deleteShoppingItem(id);
      if (editingItemId === id) {
        resetForm();
      }
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  function startEditing(item) {
    setEditingItemId(item.id);
    setStatusMessage("");
    setName(item.name);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setNotes(item.notes || "");
  }

  const boughtCount = items.filter((item) => item.bought).length;
  const pendingCount = items.length - boughtCount;
  const filteredItems = items.filter((item) => {
    if (filter === "pending") return !item.bought;
    if (filter === "bought") return item.bought;
    return true;
  });

  return (
    <div className="shoppingPage">
      <section className="compareHero">
        <div className="compareHeroText">
          <span className="eyebrow">Smart shopping</span>
          <h1>Keep your next grocery run organized and ready.</h1>
          <p>
            Build a running shopping list for pantry refills, meal prep, and
            household essentials without losing track of what is already bought.
          </p>
        </div>

        <div className="compareHighlightCard">
          <span className="miniLabel">Shopping progress</span>
          <strong>{items.length}</strong>
          <p>
            {pendingCount} item(s) still to buy and {boughtCount} already marked
            complete.
          </p>
          <div className="comparePriceStrip">
            <div>
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
            <div>
              <span>Bought</span>
              <strong>{boughtCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboardMainGrid">
        <div className="dashboardPrimaryColumn">
          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">
                  {editingItemId ? "Edit item" : "Add item"}
                </span>
                <h2>
                  {editingItemId
                    ? "Update your shopping entry"
                    : "Create a shopping entry"}
                </h2>
              </div>
            </div>

            <div className="quickPickerGrid">
              {starterSuggestions.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className="quickPickerCard accent-mint"
                  onClick={() => {
                    setName(item.name);
                    setQuantity(item.quantity);
                    setUnit(item.unit);
                  }}
                >
                  <span className="quickPickerInitial">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                </button>
              ))}
            </div>

            <div className="formGrid twoCols">
              <div>
                <label>Item name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rice, yogurt, detergent"
                />
              </div>
              <div>
                <label>Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Low fat, family pack, weekly refill"
                />
              </div>
            </div>

            <div className="formGrid twoCols">
              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label>Unit</label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs"
                />
              </div>
            </div>

            <div className="composerFooter">
              <p className="small">
                {editingItemId
                  ? "Update the item details, then save your changes."
                  : "Keep notes for pack size, preferred brand, or any store reminder."}
              </p>
              {statusMessage ? <span className="small">{statusMessage}</span> : null}
              <div className="actionRow">
                {editingItemId ? (
                  <button
                    className="secondaryBtn"
                    onClick={() => {
                      resetForm();
                      setStatusMessage("");
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
                <button className="primaryBtn" onClick={submitItem}>
                  {editingItemId ? "Save changes" : "Add to list"}
                </button>
              </div>
            </div>
          </article>
        </div>

        <aside className="dashboardSidebar">
          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Checklist</span>
                <h2>Shopping list</h2>
              </div>
              <span className="softBadge">{filteredItems.length} shown</span>
            </div>

            <div className="filterChips" role="tablist" aria-label="Shopping filters">
              <button
                type="button"
                className={`filterChip ${filter === "all" ? "filterChipActive" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                className={`filterChip ${
                  filter === "pending" ? "filterChipActive" : ""
                }`}
                onClick={() => setFilter("pending")}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                className={`filterChip ${
                  filter === "bought" ? "filterChipActive" : ""
                }`}
                onClick={() => setFilter("bought")}
              >
                Bought ({boughtCount})
              </button>
            </div>

            <div className="shoppingListWrap">
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <div
                    className={`shoppingListItem ${
                      item.bought ? "shoppingListItemDone" : ""
                    }`}
                    key={item.id}
                  >
                    <div className="shoppingItemMain">
                      <button
                        className={`shoppingCheck ${
                          item.bought ? "shoppingCheckDone" : ""
                        }`}
                        onClick={() => toggleBought(item)}
                      >
                        {item.bought ? "Done" : "Mark"}
                      </button>
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {item.quantity} {item.unit}
                          {item.notes ? ` - ${item.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="actionRow">
                      <button
                        className="secondaryBtn"
                        onClick={() => startEditing(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="ghostDangerBtn"
                        onClick={() => removeItem(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="emptyStateCard">
                  <strong>
                    {items.length
                      ? `No ${filter} items right now.`
                      : "Your shopping list is empty."}
                  </strong>
                  <p>
                    {items.length
                      ? "Switch filters or add more items to keep your next trip on track."
                      : "Add staples, planned recipe ingredients, or pantry refills to get started."}
                  </p>
                </div>
              )}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
