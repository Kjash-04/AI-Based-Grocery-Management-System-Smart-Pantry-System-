import React from "react";

export default function Landing({ goLogin, goSignup }) {
  const features = [
    {
      title: "AI Pantry Management",
      desc: "Track groceries, expiry dates, and pantry stock in one smart dashboard.",
      icon: "SP",
    },
    {
      title: "Receipt OCR",
      desc: "Upload grocery bills and automatically extract items using OCR.",
      icon: "OC",
    },
    {
      title: "Barcode Lookup",
      desc: "Scan barcode details and quickly identify grocery products.",
      icon: "BC",
    },
    {
      title: "Voice Quick Add",
      desc: "Add grocery items with natural language using AI-powered parsing.",
      icon: "VA",
    },
    {
      title: "Recipe Recommendations",
      desc: "Get smart recipes based on the ingredients currently available in your pantry.",
      icon: "RC",
    },
    {
      title: "Expiry Alerts",
      desc: "Identify at-risk items and reduce food waste with timely suggestions.",
      icon: "EX",
    },
  ];

  return (
    <div className="landingPage">
      <div className="landingBackdrop">
        <span className="landingGlow landingGlowOne" />
        <span className="landingGlow landingGlowTwo" />
        <span className="landingGlow landingGlowThree" />
      </div>

      <header className="landingHeader landingReveal landingDelay1">
        <div className="landingLogo">SmartPantry</div>

        <div className="landingActions">
          <button className="landingLoginBtn" onClick={goLogin}>
            Sign In
          </button>
          <button className="landingSignupBtn" onClick={goSignup}>
            Sign Up
          </button>
        </div>
      </header>

      <section className="landingHero landingReveal landingDelay2">
        <div className="landingHeroText landingHeroLead">
          <span className="landingTag">AI-Powered Grocery Management System</span>
          <h1>
            Manage your pantry smarter, reduce food waste, and discover recipes
            with AI.
          </h1>
          <p>
            Smart Pantry is an intelligent pantry management platform that helps
            users organize groceries, monitor expiry dates, scan receipts,
            identify products, and generate recipe suggestions using available
            ingredients.
          </p>

          <div className="landingHeroBtns">
            <button className="landingPrimaryBtn" onClick={goSignup}>
              Get Started
            </button>
            <button className="landingSecondaryBtn" onClick={goLogin}>
              Explore Dashboard
            </button>
          </div>

          <div className="landingHeroTicker">
            <span>Expiry tracking</span>
            <span>Receipt OCR</span>
            <span>Smart recipes</span>
            <span>Shopping flow</span>
          </div>
        </div>

        <div className="landingHeroCard">
          <div className="landingMiniCard landingFloatCard">
            <h3>What is Smart Pantry?</h3>
            <p>
              Smart Pantry is a modern AI-based grocery and pantry management
              system designed to make food storage, tracking, and meal planning
              easier.
            </p>
          </div>

          <div className="landingMiniStats landingMiniStatsAnimated">
            <div className="miniStat">
              <span className="miniStatNumber">AI</span>
              <span className="miniStatLabel">Smart Suggestions</span>
            </div>
            <div className="miniStat">
              <span className="miniStatNumber">OCR</span>
              <span className="miniStatLabel">Receipt Scanning</span>
            </div>
            <div className="miniStat">
              <span className="miniStatNumber">Live</span>
              <span className="miniStatLabel">Inventory Tracking</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landingSection landingReveal landingDelay3">
        <h2 className="sectionTitle">Main Features</h2>
        <div className="featureGrid">
          {features.map((feature, index) => (
            <div
              className="featureCard landingReveal"
              style={{ animationDelay: `${0.18 + index * 0.08}s` }}
              key={feature.title}
            >
              <div className="featureIcon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landingSection landingReveal landingDelay4">
        <h2 className="sectionTitle">How It Works</h2>
        <div className="howGrid">
          <div className="howCard landingReveal" style={{ animationDelay: "0.2s" }}>
            <span className="howStep">1</span>
            <h3>Create Account</h3>
            <p>Sign up and personalize your pantry profile.</p>
          </div>
          <div className="howCard landingReveal" style={{ animationDelay: "0.28s" }}>
            <span className="howStep">2</span>
            <h3>Add Grocery Items</h3>
            <p>Use manual input, barcode scan, voice input, or OCR bill upload.</p>
          </div>
          <div className="howCard landingReveal" style={{ animationDelay: "0.36s" }}>
            <span className="howStep">3</span>
            <h3>Track & Monitor</h3>
            <p>Monitor expiry dates and identify at-risk food items.</p>
          </div>
          <div className="howCard landingReveal" style={{ animationDelay: "0.44s" }}>
            <span className="howStep">4</span>
            <h3>Get AI Recipes</h3>
            <p>Generate smart recipe ideas using available pantry ingredients.</p>
          </div>
        </div>
      </section>

      <section className="landingSection ctaSection landingReveal landingDelay4">
        <h2>Ready to manage groceries smarter?</h2>
        <p>
          Start using Smart Pantry today and turn your pantry into an AI-powered
          kitchen assistant.
        </p>
        <div className="landingHeroBtns">
          <button className="landingPrimaryBtn" onClick={goSignup}>
            Create Account
          </button>
          <button className="landingSecondaryBtn" onClick={goLogin}>
            Sign In
          </button>
        </div>
      </section>
    </div>
  );
}
