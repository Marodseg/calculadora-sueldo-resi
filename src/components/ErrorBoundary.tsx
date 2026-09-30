import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  failed: boolean;
}

/** Evita la pantalla en blanco si algo falla al renderizar: muestra un mensaje y permite reintentar. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de la aplicación:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="error-screen" role="alert">
        <h1>Algo ha ido mal</h1>
        <p>
          La app ha tenido un problema inesperado. Tus meses siguen guardados en este dispositivo. Prueba a recargar; si
          el error persiste, puedes avisarnos en{" "}
          <a href="https://github.com/Marodseg/calculadora-sueldo-resi/issues" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
        <button className="primary-btn" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    );
  }
}
