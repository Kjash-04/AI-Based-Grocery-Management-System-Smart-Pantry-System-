import React, { useEffect, useState } from "react";
import { api } from "../api";

const quickItems = [
  {
    name: "Tomato",
    category: "Vegetables",
    unit: "pcs",
    accent: "sun",
  },
  {
    name: "Carrot",
    category: "Vegetables",
    unit: "pcs",
    accent: "amber",
  },
  {
    name: "Broccoli",
    category: "Vegetables",
    unit: "pcs",
    accent: "mint",
  },
  {
    name: "Onion",
    category: "Vegetables",
    unit: "pcs",
    accent: "berry",
  },
  {
    name: "Milk",
    category: "Dairy",
    unit: "L",
    accent: "sky",
  },
  {
    name: "Apple",
    category: "Fruits",
    unit: "pcs",
    accent: "rose",
  },
];

function formatExpiryLabel(item) {
  if (!item.expiry_date) return "No expiry set";
  if (item.at_risk && item.days_to_expiry < 0) {
    return `Expired ${Math.abs(item.days_to_expiry)} day(s) ago`;
  }
  if (item.at_risk) return "Needs attention";
  return `Safe for ${item.days_to_expiry} day(s)`;
}

function formatCategorySummary(items) {
  if (!items.length) return [];

  const grouped = items.reduce((acc, item) => {
    const key = item.category || "Other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
}

function isLowStock(item) {
  const quantity = Number(item.quantity || 0);
  const unit = String(item.unit || "").toLowerCase();

  if (unit === "kg" || unit === "l") return quantity <= 1;
  if (unit === "g" || unit === "ml") return quantity <= 500;
  return quantity <= 2;
}

export default function Dashboard({ onError }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");

  const [voiceText, setVoiceText] = useState("");
  const [barcode, setBarcode] = useState("");
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrItems, setOcrItems] = useState([]);
  const [ocrRawText, setOcrRawText] = useState("");
  const [restockMessage, setRestockMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "Other",
    quantity: 1,
    unit: "pcs",
    price: 0,
    expiry_date: "",
  });

  async function load() {
    try {
      const data = await api.listInventory();
      setItems(data);
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addManual() {
    try {
      await api.addItem({
        name,
        category,
        quantity: Number(quantity),
        unit,
        price: Number(price),
        expiry_date: expiryDate ? expiryDate : null,
      });

      setName("");
      setCategory("Other");
      setQuantity(1);
      setUnit("pcs");
      setPrice(0);
      setExpiryDate("");
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function del(id) {
    try {
      await api.deleteItem(id);
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      name: item.name || "",
      category: item.category || "Other",
      quantity: item.quantity ?? 1,
      unit: item.unit || "pcs",
      price: item.price ?? 0,
      expiry_date: item.expiry_date || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      name: "",
      category: "Other",
      quantity: 1,
      unit: "pcs",
      price: 0,
      expiry_date: "",
    });
  }

  async function saveEdit(id) {
    try {
      await api.updateItem(id, {
        name: editForm.name,
        category: editForm.category,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        price: Number(editForm.price),
        expiry_date: editForm.expiry_date || null,
      });
      onError("");
      cancelEdit();
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function doQuickAdd() {
    try {
      await api.quickAdd({ text: voiceText });
      setVoiceText("");
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  async function doBarcodeLookup() {
    try {
      const info = await api.barcodeLookup({ barcode });
      setName(info.name || "");
      setCategory(info.category || "Other");
      setExpiryDate(info.estimated_expiry_date || "");
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  async function doOCR() {
    try {
      if (!ocrFile) return;
      const res = await api.ocrReceipt(ocrFile);
      setOcrItems(res.items || []);
      setOcrRawText(res.raw_text || "");
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  async function commitOCR() {
    try {
      const cleanItems = ocrItems.filter((item) => item.name?.trim());
      if (!cleanItems.length) return;
      await api.ocrCommit(cleanItems);
      setOcrItems([]);
      setOcrFile(null);
      setOcrRawText("");
      onError("");
      load();
    } catch (e) {
      onError(e.message);
    }
  }

  function updateOcrItem(index, field, value) {
    setOcrItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function removeOcrItem(index) {
    setOcrItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addOcrRow() {
    setOcrItems((current) => [
      ...current,
      { name: "", quantity: 1, unit: "pcs", price: 0 },
    ]);
  }

  async function addLowStockToShoppingList(selectedItems) {
    try {
      const results = await Promise.all(
        selectedItems.map((item) =>
          api.addShoppingItem({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            notes: "Auto-added from low stock alert",
          })
        )
      );
      const mergedCount = results.filter((result) => result.action === "merged").length;
      const createdCount = results.length - mergedCount;
      setRestockMessage(
        mergedCount > 0
          ? `${createdCount} item(s) added, ${mergedCount} updated in shopping list`
          : `${selectedItems.length} item(s) added to shopping list`
      );
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  const totalItems = items.length;
  const atRiskItems = items.filter((item) => item.at_risk).length;
  const noExpiryItems = items.filter((item) => !item.expiry_date).length;
  const inStockUnits = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const inventoryValue = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const recentItems = [...items]
    .sort((a, b) => b.id - a.id)
    .slice(0, 4);
  const lowStockItems = items.filter(isLowStock).slice(0, 5);
  const categorySummary = formatCategorySummary(items);
  const pantryHealth = totalItems
    ? Math.max(8, Math.round(((totalItems - atRiskItems) / totalItems) * 100))
    : 100;

  return (
    <div className="dashboardPage">
      <section className="dashboardHero">
        <div className="dashboardHeroContent">
          <span className="eyebrow">Pantry operations</span>
          <h1>Keep every shelf visible, fresh, and ready for the next meal.</h1>
          <p>
            Track stock, scan receipts, and capture new groceries from one
            command center built for your SmartPantry workflow.
          </p>

          <div className="heroActions">
            <button className="primaryBtn" onClick={addManual}>
              Add current item
            </button>
            <button className="secondaryBtn" onClick={doQuickAdd}>
              Run quick add
            </button>
          </div>
        </div>

        <div className="dashboardHeroAside">
          <div className="spotlightCard">
            <div className="spotlightHeader">
              <span>Pantry health</span>
              <strong>{pantryHealth}%</strong>
            </div>
            <div className="progressTrack">
              <div
                className="progressFill"
                style={{ width: `${pantryHealth}%` }}
              />
            </div>
            <p>
              {atRiskItems
                ? `${atRiskItems} item(s) need attention soon.`
                : "Everything in the pantry looks stable right now."}
            </p>
          </div>

          <div className="heroMiniGrid">
            <div className="heroMiniCard">
              <span className="miniLabel">Inventory value</span>
              <strong>Rs. {inventoryValue.toFixed(0)}</strong>
            </div>
            <div className="heroMiniCard">
              <span className="miniLabel">Tracked units</span>
              <strong>{inStockUnits}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="statsGrid">
        <article className="metricCard accentLeaf">
          <span className="metricLabel">Total products</span>
          <strong className="metricValue">{totalItems}</strong>
          <p>Live items currently tracked across the pantry.</p>
        </article>
        <article className="metricCard accentAmber">
          <span className="metricLabel">At risk</span>
          <strong className="metricValue">{atRiskItems}</strong>
          <p>Products that are close to expiry or already overdue.</p>
        </article>
        <article className="metricCard accentSlate">
          <span className="metricLabel">No expiry date</span>
          <strong className="metricValue">{noExpiryItems}</strong>
          <p>Items that still need a freshness window assigned.</p>
        </article>
        <article className="metricCard accentBlue">
          <span className="metricLabel">Top categories</span>
          <div className="categoryPills">
            {categorySummary.length ? (
              categorySummary.map(([group, count]) => (
                <span className="badge" key={group}>
                  {group} {count}
                </span>
              ))
            ) : (
              <span className="small">No category data yet.</span>
            )}
          </div>
        </article>
      </section>

      <section className="dashboardMainGrid">
        <div className="dashboardPrimaryColumn">
          <article className="panelCard inventoryComposer">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Manual entry</span>
                <h2>Compose a pantry item</h2>
              </div>
              <span className="softBadge">Fast add</span>
            </div>

            <div className="quickPickerGrid">
              {quickItems.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`quickPickerCard accent-${item.accent}`}
                  onClick={() => {
                    setName(item.name);
                    setCategory(item.category);
                    setUnit(item.unit);
                  }}
                >
                  <span className="quickPickerInitial">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <strong>{item.name}</strong>
                  <span>{item.category}</span>
                </button>
              ))}
            </div>

            {name && (
              <div className="selectedItemBox">
                Ready to add <strong>{name}</strong>
                <span className="badge">{category}</span>
              </div>
            )}

            <div className="formGrid twoCols">
              <div>
                <label>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rice, yogurt, spinach"
                />
              </div>
              <div>
                <label>Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Vegetables"
                />
              </div>
            </div>

            <div className="formGrid fourCols">
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
              <div>
                <label>Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <label>Expiry date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="composerFooter">
              <p className="small">
                Add manually when you want exact control over price, quantity,
                and freshness.
              </p>
              <button className="primaryBtn" onClick={addManual}>
                Save item
              </button>
            </div>
          </article>

          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Inventory board</span>
                <h2>Current pantry snapshot</h2>
              </div>
              <span className="softBadge">{totalItems} rows</span>
            </div>

            <div className="inventoryList">
              {items.length ? (
                items.map((item) => (
                  <div className="inventoryRowCard" key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <div className="inventoryEditGrid">
                          <div>
                            <label>Name</label>
                            <input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label>Category</label>
                            <input
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  category: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label>Quantity</label>
                            <input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  quantity: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label>Unit</label>
                            <input
                              value={editForm.unit}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  unit: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label>Price</label>
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  price: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label>Expiry date</label>
                            <input
                              type="date"
                              value={editForm.expiry_date}
                              onChange={(e) =>
                                setEditForm((current) => ({
                                  ...current,
                                  expiry_date: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="inventoryEditActions">
                          <button
                            className="primaryBtn"
                            onClick={() => saveEdit(item.id)}
                          >
                            Save
                          </button>
                          <button className="secondaryBtn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="inventoryRowMain">
                          <div className="inventoryAvatar">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="inventoryTitleRow">
                              <strong>{item.name}</strong>
                              <span className="badge">{item.category || "Other"}</span>
                            </div>
                            <p>
                              {item.quantity} {item.unit} available
                            </p>
                          </div>
                        </div>

                        <div className="inventoryMeta">
                          <span
                            className={`statusChip ${
                              item.at_risk ? "statusRisk" : "statusGood"
                            }`}
                          >
                            {formatExpiryLabel(item)}
                          </span>
                          <span className="inventoryDate">
                            {item.expiry_date || "No expiry"}
                          </span>
                        </div>

                        <div className="inventoryActionStack">
                          <button
                            className="secondaryBtn"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="ghostDangerBtn"
                            onClick={() => del(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="emptyStateCard">
                  <strong>No pantry items yet.</strong>
                  <p>
                    Start with a quick item above, a barcode lookup, or an OCR
                    receipt import.
                  </p>
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="dashboardSidebar">
          <article className="panelCard utilityPanel">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Smart tools</span>
                <h2>Capture faster</h2>
              </div>
            </div>

            <div className="toolCard">
              <label>Barcode lookup</label>
              <p className="panelHint">
                Autofill the product name, category, and estimated expiry date.
              </p>
              <div className="stackedAction">
                <input
                  placeholder="Enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
                <button className="primaryBtn" onClick={doBarcodeLookup}>
                  Lookup barcode
                </button>
              </div>
            </div>

            <div className="toolCard">
              <label>Voice or text quick add</label>
              <p className="panelHint">
                Example: add 2 liters of milk and 6 eggs.
              </p>
              <div className="stackedAction">
                <textarea
                  rows="4"
                  placeholder="Describe the groceries you bought"
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                />
                <button className="secondaryBtn" onClick={doQuickAdd}>
                  Parse with AI
                </button>
              </div>
            </div>

            <div className="toolCard">
              <label>Receipt OCR</label>
              <p className="panelHint">
                Upload a bill image and save extracted items in one step.
              </p>
              <input
                className="fileInput"
                type="file"
                accept="image/*"
                onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
              />
              <div className="btnRow">
                <button className="primaryBtn" onClick={doOCR}>
                  Run OCR
                </button>
                <button className="secondaryBtn" onClick={addOcrRow}>
                  Add row
                </button>
                <button className="secondaryBtn" onClick={commitOCR}>
                  Save extracted items
                </button>
              </div>
              {ocrRawText && (
                <div className="ocrRawBox">
                  <div className="sectionHeading">
                    <div>
                      <span className="eyebrow">OCR text</span>
                      <h3>Receipt preview</h3>
                    </div>
                  </div>
                  <pre>{ocrRawText}</pre>
                </div>
              )}
              {ocrItems.length > 0 && (
                <div className="ocrBox">
                  <div className="sectionHeading">
                    <div>
                      <span className="eyebrow">Review extracted items</span>
                      <h3>Edit before save</h3>
                    </div>
                  </div>
                  {ocrItems.map((item, index) => (
                    <div className="ocrEditRow" key={`${item.name}-${index}`}>
                      <input
                        value={item.name}
                        onChange={(e) =>
                          updateOcrItem(index, "name", e.target.value)
                        }
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateOcrItem(index, "quantity", e.target.value)
                        }
                        placeholder="Qty"
                      />
                      <input
                        value={item.unit}
                        onChange={(e) =>
                          updateOcrItem(index, "unit", e.target.value)
                        }
                        placeholder="Unit"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          updateOcrItem(index, "price", e.target.value)
                        }
                        placeholder="Price"
                      />
                      <button
                        className="ghostDangerBtn"
                        onClick={() => removeOcrItem(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Recent activity</span>
                <h2>Latest additions</h2>
              </div>
            </div>

            <div className="activityList">
              {recentItems.length ? (
                recentItems.map((item) => (
                  <div className="activityItem" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>
                        {item.quantity} {item.unit} in {item.category || "Other"}
                      </p>
                    </div>
                    <span className="statusChip mutedChip">
                      {item.expiry_date || "No expiry"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="small">Recent additions will appear here.</p>
              )}
            </div>
          </article>

          <article className="panelCard">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Low stock watch</span>
                <h2>Restock suggestions</h2>
              </div>
              <span className="softBadge">{lowStockItems.length} items</span>
            </div>

            {lowStockItems.length ? (
              <>
                <div className="lowStockList">
                  {lowStockItems.map((item) => (
                    <div className="lowStockItem" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {item.quantity} {item.unit} left
                        </p>
                      </div>
                      <button
                        className="secondaryBtn"
                        onClick={() => addLowStockToShoppingList([item])}
                      >
                        Restock
                      </button>
                    </div>
                  ))}
                </div>
                <div className="recipeActionRow" style={{ marginTop: 16 }}>
                  <button
                    className="primaryBtn"
                    onClick={() => addLowStockToShoppingList(lowStockItems)}
                  >
                    Add All Low Stock Items
                  </button>
                  {restockMessage && <span className="small">{restockMessage}</span>}
                </div>
              </>
            ) : (
              <p className="small">
                Your pantry looks well stocked right now.
              </p>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
