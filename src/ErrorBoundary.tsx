import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Vocabito abgestürzt:", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "1rem",
          background:
            "linear-gradient(180deg, #d7f1ff 0%, #9ed7ff 100%)"
        }}
      >
        <section
          style={{
            width: "min(100%, 560px)",
            background: "#ffffff",
            border: "2px solid #bfe5fb",
            borderRadius: "28px",
            boxShadow: "0 16px 36px rgba(30, 144, 255, 0.16)",
            padding: "1.25rem",
            color: "#50311d",
            fontFamily: '"Nunito", "Trebuchet MS", "Segoe UI", sans-serif'
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Die App musste neu gesichert werden</h1>
          <p style={{ color: "#4f7790", fontWeight: 700 }}>
            Es ist ein Fehler aufgetreten. Die App bleibt jetzt trotzdem erreichbar.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              minHeight: "52px",
              borderRadius: "18px",
              padding: "0.9rem 1rem",
              fontWeight: 900,
              border: 0,
              background: "linear-gradient(180deg, #70d7ff 0%, #1cb0f6 100%)",
              color: "#fff",
              boxShadow: "0 8px 0 #1899d6"
            }}
          >
            App neu laden
          </button>
        </section>
      </div>
    );
  }
}
