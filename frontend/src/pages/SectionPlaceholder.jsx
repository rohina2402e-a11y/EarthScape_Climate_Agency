import { Link } from "react-router-dom";
import NavIcon from "../components/NavIcon.jsx";

function PreviewCard({ section }) {
  return (
    <Link className="module-preview" to={`/${section.path}`}>
      <span className="module-preview-icon"><NavIcon name={section.icon} size={19} /></span>
      <span className="module-preview-copy">
        <strong>{section.title}</strong>
        <span>{section.description}</span>
      </span>
      <NavIcon className="module-preview-arrow" name="arrow" size={17} />
    </Link>
  );
}

export default function SectionPlaceholder({
  eyebrow,
  title,
  description,
  sections = [],
  welcome = false
}) {
  if (!welcome) {
    return (
      <section aria-labelledby="section-title" className="coming-soon">
        <div className="coming-soon-art"><NavIcon name="leaf" size={30} /></div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="section-title">{title}</h1>
        <p className="coming-soon-description">{description}</p>
        <span className="coming-soon-tag">This page will be built in a later step</span>
      </section>
    );
  }

  const sectionIcons = {
    admin: "dashboard",
    analyst: "analyst",
    data: "data",
    visualizations: "chart",
    predictions: "prediction",
    notifications: "bell",
    support: "support",
    login: "shield"
  };

  return (
    <div className="home-page">
      <section aria-labelledby="welcome-title" className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-kicker"><span /> CLIMATE INTELLIGENCE PLATFORM</span>
          <h1 id="welcome-title">{title}</h1>
          <p>{description}</p>
          <Link className="welcome-action" to="/admin">
            Explore your workspace <NavIcon name="arrow" size={17} />
          </Link>
        </div>
        <div aria-hidden="true" className="welcome-art">
          <div className="welcome-art-sun" />
          <div className="welcome-art-orbit orbit-one" />
          <div className="welcome-art-orbit orbit-two" />
          <div className="welcome-art-globe"><NavIcon name="globe" size={96} /></div>
          <div className="welcome-art-leaf leaf-one"><NavIcon name="leaf" size={34} /></div>
          <div className="welcome-art-leaf leaf-two"><NavIcon name="leaf" size={23} /></div>
        </div>
        <span className="welcome-banner-caption">OBSERVE <span>•</span> UNDERSTAND <span>•</span> ACT</span>
      </section>

      <div className="home-section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Explore your workspace</h2>
        </div>
        <span className="module-count">01 <span>/</span> 08 MODULES</span>
      </div>

      <section aria-label="Climate workspace sections" className="module-grid">
        {sections.map((section) => (
          <PreviewCard
            key={section.path}
            section={{ ...section, icon: sectionIcons[section.path] }}
          />
        ))}
      </section>

      <footer className="home-footer">
        <span>EarthScape Climate Agency</span>
        <span>Building a more informed climate future.</span>
      </footer>
    </div>
  );
}
