// backend/utils/xmlBuilderHelper.js
const { assign, isFunction } = {
  assign: Object.assign,
  isFunction: (val) => typeof val === "function",
};

// Minimal XML builder helper
class XMLBuilder {
  constructor(name, attributes = {}) {
    this.name = name;
    this.attributes = attributes;
    this.children = [];
  }

  element(name, attributes = {}) {
    const el = new XMLBuilder(name, attributes);
    this.children.push(el);
    this.current = el;
    return this;
  }

  attribute(name, value) {
    if (!this.current) this.attributes[name] = value;
    else this.current.attributes[name] = value;
    return this;
  }

  up() {
    this.current = null;
    return this;
  }

  end({ pretty = false } = {}) {
    return this._render(this, 0, pretty);
  }

  _render(node, indent, pretty) {
    const spacing = pretty ? "  ".repeat(indent) : "";
    const attrs = Object.entries(node.attributes)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join("");

    if (node.children.length === 0)
      return `${spacing}<${node.name}${attrs}/>${pretty ? "\n" : ""}`;

    const children = node.children
      .map((child) => this._render(child, indent + 1, pretty))
      .join("");

    const newline = pretty ? "\n" : "";
    return `${spacing}<${node.name}${attrs}>${newline}${children}${spacing}</${node.name}>${newline}`;
  }
}

module.exports = {
  create: (name, options) => new XMLBuilder(name, options),
};
