import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function Recipes({ onError }) {
  const [data, setData] = useState({
    at_risk_items: [],
    recipes: [],
    source: "",
    notice: "",
  });
  const [loading, setLoading] = useState(false);
  const [shoppingStatus, setShoppingStatus] = useState({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.getGeminiRecipes();
      setData(res);
      onError("");
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addMissingIngredient(name, recipeTitle) {
    try {
      const result = await api.addShoppingItem({
        name,
        quantity: 1,
        unit: "pcs",
        notes: `From recipe: ${recipeTitle}`,
      });
      setShoppingStatus((current) => ({
        ...current,
        [`${recipeTitle}:${name}`]:
          result.action === "merged"
            ? "Updated existing shopping item"
            : "Added to shopping list",
      }));
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  async function addAllMissing(recipe) {
    const missing = recipe.missing_ingredients || [];
    if (!missing.length) return;

    try {
      const results = await Promise.all(
        missing.map((name) =>
          api.addShoppingItem({
            name,
            quantity: 1,
            unit: "pcs",
            notes: `From recipe: ${recipe.title}`,
          })
        )
      );
      const mergedCount = results.filter((result) => result.action === "merged").length;
      const createdCount = results.length - mergedCount;
      setShoppingStatus((current) => ({
        ...current,
        [`${recipe.title}:all`]:
          mergedCount > 0
            ? `${createdCount} added, ${mergedCount} updated`
            : `${missing.length} ingredient(s) added`,
      }));
      onError("");
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="card">
      <div className="sectionHeading" style={{ marginBottom: 16 }}>
        <h2>Recipes</h2>
        <button className="primaryBtn" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Get Recipes"}
        </button>
      </div>

      {data.notice && (
        <div className="selectedItemBox" style={{ marginTop: 16 }}>
          {data.notice}
        </div>
      )}

      <h3>At-Risk Items (within 48h)</h3>
      {data.at_risk_items?.length ? (
        <ul>
          {data.at_risk_items.map((item, i) => (
            <li key={i}>
              {item.name}{" "}
              {item.days_to_expiry < 0
                ? `- expired ${Math.abs(item.days_to_expiry)} day(s) ago`
                : `- expires in ${item.days_to_expiry} day(s)`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">No at-risk items right now.</p>
      )}

      <h3>
        Recommended Recipes
        {data.source
          ? ` (${data.source === "gemini" ? "Gemini" : "Local fallback"})`
          : ""}
      </h3>
      {data.recipes?.length ? (
        data.recipes.map((recipe, i) => (
          <div className="card" key={i}>
            <h3>{recipe.title}</h3>

            {recipe.reason && (
              <p>
                <b>Reason:</b> {recipe.reason}
              </p>
            )}

            {typeof recipe.match_percent === "number" && (
              <p>
                <b>Pantry Match:</b> {recipe.match_percent}%
              </p>
            )}

            {Array.isArray(recipe.ingredients_used) &&
              recipe.ingredients_used.length > 0 && (
                <p>
                  <b>Ingredients Used:</b> {recipe.ingredients_used.join(", ")}
                </p>
              )}

            {Array.isArray(recipe.missing_ingredients) &&
              recipe.missing_ingredients.length > 0 && (
                <div>
                  <p>
                    <b>Missing Ingredients:</b>{" "}
                    {recipe.missing_ingredients.join(", ")}
                  </p>
                  <div className="recipeActionRow">
                    <button
                      className="secondaryBtn"
                      onClick={() => addAllMissing(recipe)}
                    >
                      Add All To Shopping List
                    </button>
                    {shoppingStatus[`${recipe.title}:all`] && (
                      <span className="small">
                        {shoppingStatus[`${recipe.title}:all`]}
                      </span>
                    )}
                  </div>
                  <div className="recipeChipRow">
                    {recipe.missing_ingredients.map((ingredient) => (
                      <button
                        key={`${recipe.title}-${ingredient}`}
                        className="recipeMissingChip"
                        onClick={() =>
                          addMissingIngredient(ingredient, recipe.title)
                        }
                      >
                        + {ingredient}
                      </button>
                    ))}
                  </div>
                  {recipe.missing_ingredients.map((ingredient) => {
                    const key = `${recipe.title}:${ingredient}`;
                    if (!shoppingStatus[key]) return null;
                    return (
                      <p className="small" key={key}>
                        {ingredient}: {shoppingStatus[key]}
                      </p>
                    );
                  })}
                </div>
              )}

            {Array.isArray(recipe.steps) && recipe.steps.length > 0 ? (
              <div>
                <b>Steps:</b>
                <ol>
                  {recipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="small">No steps available.</p>
            )}
          </div>
        ))
      ) : (
        <p className="small">No recipe suggestions found.</p>
      )}
    </div>
  );
}
