import { Component } from 'react';

// Keeps a failing optional layer (the WebGL background) from taking down the site.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.documentElement.dataset.webgl = 'off'; }
  render() { return this.state.failed ? null : this.props.children; }
}
