import React from "react";

const summary = {
  matchedProducts: 20,
  bigBasketCheaper: 11,
  zeptoCheaper: 9,
  averageBigBasket: 26.62,
  averageZepto: 26.25,
};

const comparisonItems = [
  {
    name: "Basil",
    category: "Herbs",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/40202140_4-happychef-basil.jpg",
    bigBasketPrice: 79,
    zeptoPrice: 17,
    winner: "Zepto",
    savings: 62,
  },
  {
    name: "Pineapple",
    category: "Fruits",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000156_21-fresho-pineapple.jpg",
    bigBasketPrice: 39,
    zeptoPrice: 79,
    winner: "BigBasket",
    savings: 40,
  },
  {
    name: "Pomegranate Peeled",
    category: "Ready To Eat",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/40005823_7-fresho-pomegranate-peeled.jpg",
    bigBasketPrice: 82,
    zeptoPrice: 49,
    winner: "Zepto",
    savings: 33,
  },
  {
    name: "Tomato Hybrid",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000201_15-fresho-tomato-hybrid.jpg",
    bigBasketPrice: 9,
    zeptoPrice: 35,
    winner: "BigBasket",
    savings: 26,
  },
  {
    name: "Lettuce Iceberg",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000132_17-fresho-lettuce-iceberg.jpg",
    bigBasketPrice: 44,
    zeptoPrice: 21,
    winner: "Zepto",
    savings: 23,
  },
  {
    name: "Baby Corn Peeled",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000017_20-fresho-baby-corn-peeled.jpg",
    bigBasketPrice: 46,
    zeptoPrice: 29,
    winner: "Zepto",
    savings: 17,
  },
  {
    name: "Potato",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/40048457_9-fresho-potato-new-crop.jpg",
    bigBasketPrice: 38.75,
    zeptoPrice: 29,
    winner: "Zepto",
    savings: 9.75,
  },
  {
    name: "Onion",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000148_30-fresho-onion.jpg",
    bigBasketPrice: 26,
    zeptoPrice: 21,
    winner: "Zepto",
    savings: 5,
  },
  {
    name: "Garlic",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000115_15-fresho-garlic.jpg",
    bigBasketPrice: 20.5,
    zeptoPrice: 13,
    winner: "Zepto",
    savings: 7.5,
  },
  {
    name: "Ladies Finger",
    category: "Vegetables",
    image:
      "https://www.bigbasket.com/media/uploads/p/l/10000143_14-fresho-ladies-finger.jpg",
    bigBasketPrice: 12.25,
    zeptoPrice: 12,
    winner: "Zepto",
    savings: 0.25,
  },
];

function currency(value) {
  return `Rs. ${value.toFixed(2)}`;
}

export default function Compare() {
  return (
    <div className="comparePage">
      <section className="compareHero">
        <div className="compareHeroText">
          <span className="eyebrow">Marketplace watch</span>
          <h1>Compare BigBasket and Zepto prices side by side.</h1>
          <p>
            Built from the uploaded BigBasket CSV and Zepto spreadsheet, this
            view highlights shared products, average pricing, and where each
            platform wins on savings.
          </p>
        </div>

        <div className="compareHighlightCard">
          <span className="miniLabel">Matched catalog products</span>
          <strong>{summary.matchedProducts}</strong>
          <p>
            BigBasket is cheaper on {summary.bigBasketCheaper} items, while
            Zepto leads on {summary.zeptoCheaper}.
          </p>
          <div className="comparePriceStrip">
            <div>
              <span>Avg BigBasket</span>
              <strong>{currency(summary.averageBigBasket)}</strong>
            </div>
            <div>
              <span>Avg Zepto</span>
              <strong>{currency(summary.averageZepto)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="compareSummaryGrid">
        <article className="metricCard accentLeaf">
          <span className="metricLabel">BigBasket wins</span>
          <strong className="metricValue">{summary.bigBasketCheaper}</strong>
          <p>Products where BigBasket offers the lower current price.</p>
        </article>
        <article className="metricCard accentBlue">
          <span className="metricLabel">Zepto wins</span>
          <strong className="metricValue">{summary.zeptoCheaper}</strong>
          <p>Products where Zepto comes in cheaper in the uploaded sheet.</p>
        </article>
        <article className="metricCard accentAmber">
          <span className="metricLabel">Average cart price</span>
          <strong className="metricValue">{currency(summary.averageZepto)}</strong>
          <p>Across matched products, Zepto is slightly lower on average.</p>
        </article>
      </section>

      <section className="compareCardsGrid">
        {comparisonItems.map((item) => (
          <article className="compareItemCard" key={item.name}>
            <div className="compareImageWrap">
              <img src={item.image} alt={item.name} className="compareImage" />
            </div>

            <div className="compareItemHeader">
              <div>
                <span className="softBadge">{item.category}</span>
                <h3>{item.name}</h3>
              </div>
              <span
                className={`compareWinner ${
                  item.winner === "BigBasket"
                    ? "winnerBigBasket"
                    : "winnerZepto"
                }`}
              >
                {item.winner} wins
              </span>
            </div>

            <div className="comparePriceGrid">
              <div className="compareVendorPrice">
                <span>BigBasket</span>
                <strong>{currency(item.bigBasketPrice)}</strong>
              </div>
              <div className="compareVendorPrice">
                <span>Zepto</span>
                <strong>{currency(item.zeptoPrice)}</strong>
              </div>
            </div>

            <p className="compareSavings">
              Savings gap: <strong>{currency(item.savings)}</strong>
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
