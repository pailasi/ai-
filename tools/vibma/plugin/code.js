(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // ../core/dist/utils/color.js
  function rgbaToHex(color) {
    if (typeof color === "string" && color.startsWith("#")) return color;
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a !== void 0 ? Math.round(color.a * 255) : 255;
    const hex = [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return a === 255 ? `#${hex}` : `#${hex}${a.toString(16).padStart(2, "0")}`;
  }
  var init_color = __esm({
    "../core/dist/utils/color.js"() {
    }
  });

  // src/utils/serialize-node.ts
  var serialize_node_exports = {};
  __export(serialize_node_exports, {
    DEFAULT_NODE_BUDGET: () => DEFAULT_NODE_BUDGET,
    serializeComponentProperties: () => serializeComponentProperties,
    serializeNode: () => serializeNode
  });
  function cleanPropKey(key) {
    const idx = key.indexOf("#");
    return idx > 0 ? key.slice(0, idx) : key;
  }
  function serializeComponentProperties(cp) {
    const out = {};
    for (const [key, prop] of Object.entries(cp)) {
      const clean = cleanPropKey(key);
      if (prop.type === "VARIANT" || prop.type === "TEXT" || prop.type === "BOOLEAN") {
        out[clean] = prop.value;
      } else if (prop.type === "INSTANCE_SWAP") {
        out[clean] = { type: "INSTANCE_SWAP", value: prop.value };
      }
    }
    return out;
  }
  function disambiguatedVarName(v) {
    return __async(this, null, function* () {
      const all = yield figma.variables.getLocalVariablesAsync(v.resolvedType);
      const dupes = all.filter((other) => other.name === v.name && other.id !== v.id);
      if (dupes.length === 0) return v.name;
      const col = yield figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      return col ? `${col.name}/${v.name}` : v.name;
    });
  }
  function serializeNode(_0) {
    return __async(this, arguments, function* (node, depth = -1, currentDepth = 0, budget = { remaining: DEFAULT_NODE_BUDGET }, verbose = false) {
      var _a;
      if (budget.remaining <= 0) {
        return { id: node.id, name: node.name, type: node.type, _truncated: true };
      }
      budget.remaining--;
      if (node.type === "VECTOR") {
        return { id: node.id, name: node.name, type: node.type };
      }
      const out = {
        id: node.id,
        name: node.name,
        type: node.type
      };
      if (currentDepth === 0 && node.parent) {
        out.parentId = node.parent.id;
        out.parentName = node.parent.name;
        out.parentType = node.parent.type;
      }
      if ("fills" in node) {
        const fills = node.fills;
        if (fills !== figma.mixed && Array.isArray(fills) && fills.length > 0) {
          out.fills = fills.map(serializePaint);
        }
      }
      if ("strokes" in node) {
        const strokes = node.strokes;
        if (Array.isArray(strokes) && strokes.length > 0) {
          out.strokes = strokes.map(serializePaint);
        }
      }
      if ("cornerRadius" in node) {
        const cr = node.cornerRadius;
        if (cr !== void 0 && cr !== figma.mixed && cr > 0) {
          out.cornerRadius = cr;
        } else if (cr === figma.mixed && "topLeftRadius" in node) {
          out.topLeftRadius = node.topLeftRadius;
          out.topRightRadius = node.topRightRadius;
          out.bottomRightRadius = node.bottomRightRadius;
          out.bottomLeftRadius = node.bottomLeftRadius;
        }
      }
      if ("strokeWeight" in node) {
        const sw = node.strokeWeight;
        if (sw !== void 0 && sw !== figma.mixed && sw > 0 && (verbose || out.strokes)) out.strokeWeight = sw;
      }
      if (verbose) {
        if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
          out.absoluteBoundingBox = node.absoluteBoundingBox;
        } else if ("absoluteTransform" in node && "width" in node) {
          const t = node.absoluteTransform;
          if (t) {
            out.absoluteBoundingBox = {
              x: t[0][2],
              y: t[1][2],
              width: node.width,
              height: node.height
            };
          }
        }
      }
      if (verbose && "clipsContent" in node) {
        out.clipsContent = node.clipsContent;
      }
      if ("characters" in node) {
        out.characters = node.characters;
      }
      if (node.type === "INSTANCE") {
        const inst = node;
        try {
          const main = yield inst.getMainComponentAsync();
          if (main && !main.remote) out.componentId = main.id;
        } catch (e) {
        }
        const cp = inst.componentProperties;
        if (cp && typeof cp === "object" && Object.keys(cp).length > 0) {
          out.componentProperties = serializeComponentProperties(cp);
        }
        const overrides = inst.overrides || [];
        if (overrides.length > 0) {
          out.overrides = overrides.map((o) => ({ id: o.id, fields: o.overriddenFields }));
        }
      }
      if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
        const comp = node;
        const isVariant = node.type === "COMPONENT" && ((_a = node.parent) == null ? void 0 : _a.type) === "COMPONENT_SET";
        if (comp.description) out.description = comp.description;
        try {
          if (!isVariant && comp.componentPropertyDefinitions) {
            out.propertyDefinitions = comp.componentPropertyDefinitions;
          }
          if (node.type === "COMPONENT_SET") {
            if (comp.variantGroupProperties) out.variantGroupProperties = comp.variantGroupProperties;
            if ("children" in comp) out.variantCount = comp.children.length;
          }
          if (isVariant && comp.variantProperties) {
            out.variantProperties = comp.variantProperties;
          }
        } catch (e) {
          out._error = "Component set has duplicate variant value combinations \u2014 property definitions unavailable.";
          if (node.type === "COMPONENT_SET" && "children" in comp) {
            out.variantCount = comp.children.length;
          }
        }
      }
      if ("componentPropertyReferences" in node) {
        const refs = node.componentPropertyReferences;
        if (refs && typeof refs === "object" && Object.keys(refs).length > 0) out.componentPropertyReferences = refs;
      }
      if (node.type === "TEXT") {
        const t = node;
        if (verbose) {
          const style = {};
          if (t.fontName !== figma.mixed) {
            style.fontFamily = t.fontName.family;
            style.fontStyle = t.fontName.style;
          }
          if (t.fontSize !== figma.mixed) style.fontSize = t.fontSize;
          if (t.textAlignHorizontal) style.textAlignHorizontal = t.textAlignHorizontal;
          if (t.letterSpacing !== figma.mixed) {
            const ls = t.letterSpacing;
            style.letterSpacing = ls.unit === "PIXELS" ? ls.value : ls;
          }
          if (t.lineHeight !== figma.mixed) {
            const lh = t.lineHeight;
            if (lh.unit === "PIXELS") style.lineHeightPx = lh.value;
            else if (lh.unit !== "AUTO") style.lineHeight = lh;
          }
          if (Object.keys(style).length > 0) out.style = style;
        }
        if (t.textAutoResize) out.textAutoResize = t.textAutoResize;
      }
      if ("effects" in node) {
        const effects = node.effects;
        if (Array.isArray(effects) && effects.length > 0) {
          out.effects = effects.map((e) => {
            const eff = { type: e.type, visible: e.visible };
            if (e.radius !== void 0) eff.radius = e.radius;
            if (e.color) eff.color = rgbaToHex(e.color);
            if (e.offset) eff.offset = e.offset;
            if (e.spread !== void 0) eff.spread = e.spread;
            if (e.blendMode) eff.blendMode = e.blendMode;
            return eff;
          });
        }
      }
      if ("layoutMode" in node) {
        const lm = node.layoutMode;
        if (lm && lm !== "NONE") {
          out.layoutMode = lm;
          const n = node;
          if (n.layoutWrap && n.layoutWrap !== "NO_WRAP") out.layoutWrap = n.layoutWrap;
          if (n.primaryAxisAlignItems && n.primaryAxisAlignItems !== "MIN") out.primaryAxisAlignItems = n.primaryAxisAlignItems;
          if (n.counterAxisAlignItems && n.counterAxisAlignItems !== "MIN") out.counterAxisAlignItems = n.counterAxisAlignItems;
          if (n.counterAxisSpacing !== void 0 && n.counterAxisSpacing > 0) out.counterAxisSpacing = n.counterAxisSpacing;
        }
      }
      if ("itemSpacing" in node) {
        const is = node.itemSpacing;
        if (is !== void 0 && is > 0) out.itemSpacing = is;
      }
      if ("paddingLeft" in node) {
        const n = node;
        if (n.paddingLeft || n.paddingRight || n.paddingTop || n.paddingBottom) {
          out.padding = {
            left: n.paddingLeft,
            right: n.paddingRight,
            top: n.paddingTop,
            bottom: n.paddingBottom
          };
        }
      }
      if ("opacity" in node) {
        const op = node.opacity;
        if (op !== void 0 && op !== 1) out.opacity = op;
      }
      if ("visible" in node && !node.visible) {
        out.visible = false;
      }
      if ("locked" in node && node.locked) {
        out.locked = true;
      }
      if ("rotation" in node) {
        const rot = node.rotation;
        if (rot !== void 0 && rot !== 0) out.rotation = rot;
      }
      if ("blendMode" in node) {
        const bm = node.blendMode;
        if (bm && bm !== "PASS_THROUGH") out.blendMode = bm;
      }
      if ("layoutPositioning" in node) {
        const lp = node.layoutPositioning;
        if (lp === "ABSOLUTE") out.layoutPositioning = lp;
      }
      if ("layoutSizingHorizontal" in node) {
        out.layoutSizingHorizontal = node.layoutSizingHorizontal;
      }
      if ("layoutSizingVertical" in node) {
        out.layoutSizingVertical = node.layoutSizingVertical;
      }
      if ("overflowDirection" in node) {
        const od = node.overflowDirection;
        if (od && od !== "NONE") out.overflowDirection = od;
      }
      if (verbose && "overlayPositionType" in node) {
        const n = node;
        if (n.overlayPositionType && n.overlayPositionType !== "CENTER") out.overlayPositionType = n.overlayPositionType;
        if (n.overlayBackground) out.overlayBackground = n.overlayBackground;
        if (n.overlayBackgroundInteraction && n.overlayBackgroundInteraction !== "NONE") out.overlayBackgroundInteraction = n.overlayBackgroundInteraction;
      }
      if (verbose && "reactions" in node) {
        const reactions = node.reactions;
        if (Array.isArray(reactions) && reactions.length > 0) {
          out.reactions = reactions.map(serializeReaction);
        }
      }
      if ("minWidth" in node) {
        const n = node;
        if (n.minWidth != null && n.minWidth > 0) out.minWidth = n.minWidth;
        if (n.maxWidth != null && n.maxWidth < Infinity) out.maxWidth = n.maxWidth;
        if (n.minHeight != null && n.minHeight > 0) out.minHeight = n.minHeight;
        if (n.maxHeight != null && n.maxHeight < Infinity) out.maxHeight = n.maxHeight;
      }
      if ("fillStyleId" in node) {
        const id = node.fillStyleId;
        if (id && id !== "" && id !== figma.mixed) {
          try {
            const s = yield figma.getStyleByIdAsync(id);
            if (s && !s.remote) out.fillStyleName = s.name;
          } catch (e) {
          }
        }
      }
      if ("strokeStyleId" in node) {
        const id = node.strokeStyleId;
        if (id && id !== "") {
          try {
            const s = yield figma.getStyleByIdAsync(id);
            if (s && !s.remote) out.strokeStyleName = s.name;
          } catch (e) {
          }
        }
      }
      if ("effectStyleId" in node) {
        const id = node.effectStyleId;
        if (id && id !== "") {
          try {
            const s = yield figma.getStyleByIdAsync(id);
            if (s && !s.remote) out.effectStyleName = s.name;
          } catch (e) {
          }
        }
      }
      if ("textStyleId" in node) {
        const id = node.textStyleId;
        if (id && id !== "" && id !== figma.mixed) {
          try {
            const s = yield figma.getStyleByIdAsync(id);
            if (s && !s.remote) out.textStyleName = s.name;
          } catch (e) {
          }
        }
      }
      if ("boundVariables" in node) {
        const bv = node.boundVariables;
        if (bv && typeof bv === "object") {
          const bindings = {};
          for (const [field, val] of Object.entries(bv)) {
            if (Array.isArray(val)) {
              for (const v of val) {
                if (!(v == null ? void 0 : v.id)) continue;
                const resolved = yield figma.variables.getVariableByIdAsync(v.id);
                if (resolved && !resolved.remote) bindings[field] = yield disambiguatedVarName(resolved);
              }
            } else if (val && typeof val === "object" && val.id) {
              const resolved = yield figma.variables.getVariableByIdAsync(val.id);
              if (resolved && !resolved.remote) bindings[field] = yield disambiguatedVarName(resolved);
            }
          }
          if (Object.keys(bindings).length > 0) out.boundVariables = bindings;
        }
      }
      if ("explicitVariableModes" in node) {
        const modes = node.explicitVariableModes;
        if (modes && typeof modes === "object" && Object.keys(modes).length > 0) {
          out.explicitVariableModes = modes;
        }
      }
      if (verbose && "constraints" in node) {
        out.constraints = node.constraints;
      }
      if ("annotations" in node) {
        const anns = node.annotations;
        if (anns && anns.length > 0) {
          out.annotations = anns.map((a) => {
            const brief = {};
            if (a.label) brief.label = a.label;
            else if (a.labelMarkdown) brief.label = a.labelMarkdown.replace(/[#*_`~\[\]]/g, "").slice(0, 120);
            if (a.properties && a.properties.length > 0) brief.properties = a.properties.map((p) => p.type);
            if (a.categoryId) brief.categoryId = a.categoryId;
            return brief;
          });
        }
      }
      if ("children" in node) {
        const children = node.children;
        if (depth >= 0 && currentDepth >= depth || budget.remaining <= 0) {
          const stubs = [];
          for (const c of children) {
            const stub = { id: c.id, name: c.name, type: c.type };
            if (budget.remaining <= 0) stub._truncated = true;
            if (c.type === "INSTANCE") {
              const inst = c;
              try {
                const main = yield inst.getMainComponentAsync();
                if (main && !main.remote) stub.componentId = main.id;
              } catch (e) {
              }
              const cp = inst.componentProperties;
              if (cp && Object.keys(cp).length > 0) {
                stub.componentProperties = serializeComponentProperties(cp);
              }
            }
            stubs.push(stub);
          }
          out.children = stubs;
        } else {
          const serialized = [];
          for (const c of children) {
            serialized.push(yield serializeNode(c, depth, currentDepth + 1, budget, verbose));
          }
          out.children = serialized;
        }
      }
      return out;
    });
  }
  function serializeReactionAction(a) {
    const act = { type: a.type };
    if (a.destinationId) act.destinationId = a.destinationId;
    if (a.navigation) act.navigation = a.navigation;
    if (a.transition) {
      const t = { type: a.transition.type };
      if (a.transition.duration !== void 0) t.duration = a.transition.duration;
      if (a.transition.easing) t.easing = a.transition.easing.type || a.transition.easing;
      if (a.transition.direction) t.direction = a.transition.direction;
      if (a.transition.matchLayers) t.matchLayers = true;
      act.transition = t;
    }
    if (a.url) act.url = a.url;
    if (a.variableCollectionId) act.variableCollectionId = a.variableCollectionId;
    if (a.variableModeId) act.variableModeId = a.variableModeId;
    if (a.variableId) act.variableId = a.variableId;
    if (a.variableValue !== void 0) act.variableValue = a.variableValue;
    if (a.resetScrollPosition === false) act.resetScrollPosition = false;
    if (a.overlayPositionType) act.overlayPositionType = a.overlayPositionType;
    if (a.overlayRelativePosition) act.overlayRelativePosition = a.overlayRelativePosition;
    return act;
  }
  function serializeReaction(r) {
    const out = {};
    if (r.trigger) out.trigger = r.trigger;
    if (r.actions && Array.isArray(r.actions)) {
      out.actions = r.actions.map(serializeReactionAction);
    }
    return out;
  }
  function serializePaint(paint) {
    var _a;
    const p = { type: paint.type };
    if (paint.visible === false) p.visible = false;
    if (paint.opacity !== void 0 && paint.opacity !== 1) p.opacity = paint.opacity;
    if (paint.blendMode && paint.blendMode !== "NORMAL") p.blendMode = paint.blendMode;
    if (paint.color) {
      p.color = rgbaToHex(__spreadProps(__spreadValues({}, paint.color), { a: (_a = paint.opacity) != null ? _a : 1 }));
    }
    if (paint.gradientStops) {
      p.gradientStops = paint.gradientStops.map((stop) => ({
        position: stop.position,
        color: rgbaToHex(stop.color)
      }));
    }
    if (paint.gradientTransform) p.gradientTransform = paint.gradientTransform;
    if (paint.scaleMode) p.scaleMode = paint.scaleMode;
    return p;
  }
  var DEFAULT_NODE_BUDGET;
  var init_serialize_node = __esm({
    "src/utils/serialize-node.ts"() {
      init_color();
      DEFAULT_NODE_BUDGET = 200;
    }
  });

  // src/utils/base64.ts
  var base64_exports = {};
  __export(base64_exports, {
    customBase64Decode: () => customBase64Decode,
    customBase64Encode: () => customBase64Encode
  });
  function customBase64Encode(bytes) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let base64 = "";
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;
    for (let i = 0; i < mainLength; i += 3) {
      const chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
      base64 += chars[(chunk & 16515072) >> 18] + chars[(chunk & 258048) >> 12] + chars[(chunk & 4032) >> 6] + chars[chunk & 63];
    }
    if (byteRemainder === 1) {
      const chunk = bytes[mainLength];
      base64 += chars[(chunk & 252) >> 2] + chars[(chunk & 3) << 4] + "==";
    } else if (byteRemainder === 2) {
      const chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];
      base64 += chars[(chunk & 64512) >> 10] + chars[(chunk & 1008) >> 4] + chars[(chunk & 15) << 2] + "=";
    }
    return base64;
  }
  function customBase64Decode(b64) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const lookup = new Uint8Array(128);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
    let len = b64.length;
    while (len > 0 && b64[len - 1] === "=") len--;
    const out = new Uint8Array(Math.floor(len * 3 / 4));
    let j = 0;
    for (let i = 0; i < len; i += 4) {
      const a = lookup[b64.charCodeAt(i)];
      const b = lookup[b64.charCodeAt(i + 1)];
      const c = lookup[b64.charCodeAt(i + 2)];
      const d = lookup[b64.charCodeAt(i + 3)];
      out[j++] = a << 2 | b >> 4;
      if (i + 2 < len) out[j++] = (b & 15) << 4 | c >> 2;
      if (i + 3 < len) out[j++] = (c & 3) << 6 | d;
    }
    return out.subarray(0, j);
  }
  var init_base64 = __esm({
    "src/utils/base64.ts"() {
    }
  });

  // src/utils/figma-helpers.ts
  var figma_helpers_exports = {};
  __export(figma_helpers_exports, {
    appendToParentOrPage: () => appendToParentOrPage,
    applyDeferredFill: () => applyDeferredFill,
    delay: () => delay,
    generateCommandId: () => generateCommandId,
    getFontStyle: () => getFontStyle,
    getNode: () => getNode,
    getParentNode: () => getParentNode,
    sendProgressUpdate: () => sendProgressUpdate,
    setCharacters: () => setCharacters,
    solidPaint: () => solidPaint2
  });
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function generateCommandId() {
    return "cmd_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  function sendProgressUpdate(commandId, commandType, status, progress, totalItems, processedItems, message, payload = null) {
    const update = {
      type: "command_progress",
      commandId,
      commandType,
      status,
      progress,
      totalItems,
      processedItems,
      message,
      timestamp: Date.now()
    };
    if (payload) {
      if (payload.currentChunk !== void 0 && payload.totalChunks !== void 0) {
        update.currentChunk = payload.currentChunk;
        update.totalChunks = payload.totalChunks;
        update.chunkSize = payload.chunkSize;
      }
      update.payload = payload;
    }
    figma.ui.postMessage(update);
    return update;
  }
  function solidPaint2(color) {
    var _a, _b, _c, _d;
    return {
      type: "SOLID",
      color: {
        r: (_a = color.r) != null ? _a : 0,
        g: (_b = color.g) != null ? _b : 0,
        b: (_c = color.b) != null ? _c : 0
      },
      opacity: (_d = color.a) != null ? _d : 1
    };
  }
  function getNode(nodeId) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      return node;
    });
  }
  function getParentNode(parentId) {
    return __async(this, null, function* () {
      const node = yield getNode(parentId);
      if (!("appendChild" in node)) {
        throw new Error(`Node does not support children: ${parentId}`);
      }
      return node;
    });
  }
  function appendToParentOrPage(node, parentId) {
    return __async(this, null, function* () {
      if (parentId) {
        const parent = yield getParentNode(parentId);
        parent.appendChild(node);
      } else {
        figma.currentPage.appendChild(node);
      }
    });
  }
  function applyDeferredFill(node, deferH, deferV) {
    if (deferH) {
      try {
        node.layoutSizingHorizontal = "FILL";
      } catch (_) {
      }
    }
    if (deferV) {
      try {
        node.layoutSizingVertical = "FILL";
      } catch (_) {
      }
    }
  }
  function uniqBy(arr, predicate) {
    const cb = typeof predicate === "function" ? predicate : (o) => o[predicate];
    return [
      ...arr.reduce((map, item) => {
        const key = item === null || item === void 0 ? item : cb(item);
        map.has(key) || map.set(key, item);
        return map;
      }, /* @__PURE__ */ new Map()).values()
    ];
  }
  function loadFontCached(font) {
    return __async(this, null, function* () {
      const key = `${font.family}::${font.style}`;
      if (loadedFonts.has(key)) return;
      yield figma.loadFontAsync(font);
      loadedFonts.add(key);
    });
  }
  function setCharactersStrict(node, characters, fallbackFont) {
    return __async(this, null, function* () {
      const fontHashTree = {};
      for (let i = 1; i < node.characters.length; i++) {
        const startIdx = i - 1;
        const startCharFont = node.getRangeFontName(startIdx, i);
        const startVal = `${startCharFont.family}::${startCharFont.style}`;
        while (i < node.characters.length) {
          i++;
          const charFont = node.getRangeFontName(i - 1, i);
          if (startVal !== `${charFont.family}::${charFont.style}`) break;
        }
        fontHashTree[`${startIdx}_${i}`] = startVal;
      }
      yield figma.loadFontAsync(fallbackFont);
      node.fontName = fallbackFont;
      node.characters = characters;
      yield Promise.all(
        Object.keys(fontHashTree).map((range) => __async(null, null, function* () {
          const [start, end] = range.split("_");
          const [family, style] = fontHashTree[range].split("::");
          const matchedFont = { family, style };
          yield figma.loadFontAsync(matchedFont);
          return node.setRangeFontName(Number(start), Number(end), matchedFont);
        }))
      );
      return true;
    });
  }
  function getDelimiterPos(str, delimiter, startIdx = 0, endIdx = str.length) {
    const indices = [];
    let temp = startIdx;
    for (let i = startIdx; i < endIdx; i++) {
      if (str[i] === delimiter && i + startIdx !== endIdx && temp !== i + startIdx) {
        indices.push([temp, i + startIdx]);
        temp = i + startIdx + 1;
      }
    }
    if (temp !== endIdx) indices.push([temp, endIdx]);
    return indices;
  }
  function buildLinearOrder(node) {
    const fontTree = [];
    const newLinesPos = getDelimiterPos(node.characters, "\n");
    newLinesPos.forEach(([nlStart, nlEnd]) => {
      const nlFont = node.getRangeFontName(nlStart, nlEnd);
      if (nlFont === figma.mixed) {
        const spacesPos = getDelimiterPos(node.characters, " ", nlStart, nlEnd);
        spacesPos.forEach(([spStart, spEnd]) => {
          const spFont = node.getRangeFontName(spStart, spEnd);
          fontTree.push({ start: spStart, delimiter: " ", family: spFont.family, style: spFont.style });
        });
      } else {
        fontTree.push({ start: nlStart, delimiter: "\n", family: nlFont.family, style: nlFont.style });
      }
    });
    return fontTree.sort((a, b) => a.start - b.start).map(({ family, style, delimiter }) => ({ family, style, delimiter }));
  }
  function setCharactersSmart(node, characters, fallbackFont) {
    return __async(this, null, function* () {
      const rangeTree = buildLinearOrder(node);
      const fontsToLoad = uniqBy(rangeTree, ({ family, style }) => `${family}::${style}`).map(
        ({ family, style }) => ({ family, style })
      );
      yield Promise.all([...fontsToLoad, fallbackFont].map((f) => figma.loadFontAsync(f)));
      node.fontName = fallbackFont;
      node.characters = characters;
      let prevPos = 0;
      rangeTree.forEach(({ family, style, delimiter }) => {
        if (prevPos < node.characters.length) {
          const delimPos = node.characters.indexOf(delimiter, prevPos);
          const endPos = delimPos > prevPos ? delimPos : node.characters.length;
          node.setRangeFontName(prevPos, endPos, { family, style });
          prevPos = endPos + 1;
        }
      });
      return true;
    });
  }
  function getFontStyle(weight) {
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  }
  var loadedFonts, setCharacters;
  var init_figma_helpers = __esm({
    "src/utils/figma-helpers.ts"() {
      loadedFonts = /* @__PURE__ */ new Set();
      setCharacters = (node, characters, options) => __async(null, null, function* () {
        const fallbackFont = (options == null ? void 0 : options.fallbackFont) || { family: "Inter", style: "Regular" };
        try {
          if (node.fontName === figma.mixed) {
            if ((options == null ? void 0 : options.smartStrategy) === "prevail") {
              const fontHashTree = {};
              for (let i = 1; i < node.characters.length; i++) {
                const charFont = node.getRangeFontName(i - 1, i);
                const key = `${charFont.family}::${charFont.style}`;
                fontHashTree[key] = (fontHashTree[key] || 0) + 1;
              }
              const prevailed = Object.entries(fontHashTree).sort((a, b) => b[1] - a[1])[0];
              const [family, style] = prevailed[0].split("::");
              const prevailedFont = { family, style };
              yield loadFontCached(prevailedFont);
              node.fontName = prevailedFont;
            } else if ((options == null ? void 0 : options.smartStrategy) === "strict") {
              return setCharactersStrict(node, characters, fallbackFont);
            } else if ((options == null ? void 0 : options.smartStrategy) === "experimental") {
              return setCharactersSmart(node, characters, fallbackFont);
            } else {
              const firstCharFont = node.getRangeFontName(0, 1);
              yield loadFontCached(firstCharFont);
              node.fontName = firstCharFont;
            }
          } else {
            yield loadFontCached(node.fontName);
          }
        } catch (e) {
          yield loadFontCached(fallbackFont);
          node.fontName = fallbackFont;
        }
        try {
          node.characters = characters;
          return true;
        } catch (e) {
          return false;
        }
      });
    }
  });

  // src/handlers/connection.ts
  function ping() {
    return __async(this, null, function* () {
      return {
        status: "pong",
        documentName: figma.root.name,
        currentPage: figma.currentPage.name,
        timestamp: Date.now()
      };
    });
  }
  var figmaHandlers = {
    ping
  };

  // src/handlers/document.ts
  function getDocumentInfo() {
    return __async(this, null, function* () {
      return {
        name: figma.root.name,
        currentPageId: figma.currentPage.id,
        pages: figma.root.children.map((p) => ({ id: p.id, name: p.name }))
      };
    });
  }
  function getCurrentPage() {
    return __async(this, null, function* () {
      var _a;
      yield figma.currentPage.loadAsync();
      const page = figma.currentPage;
      const result = {
        id: page.id,
        name: page.name,
        children: page.children.map((node) => ({ id: node.id, name: node.name, type: node.type }))
      };
      if ((_a = page.backgrounds) == null ? void 0 : _a.length) {
        const bg = page.backgrounds[0];
        if (bg.type === "SOLID") {
          const c = bg.color;
          result.backgroundColor = `#${[c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
        }
      }
      return result;
    });
  }
  function setCurrentPage(params) {
    return __async(this, null, function* () {
      if (!(params == null ? void 0 : params.pageId) && !(params == null ? void 0 : params.pageName)) throw new Error("Missing required param: provide pageId or pageName");
      let page;
      if (params.pageId) {
        page = yield figma.getNodeByIdAsync(params.pageId);
        if (!page || page.type !== "PAGE") throw new Error(`Page not found: ${params.pageId}`);
      } else if (params.pageName) {
        const name = params.pageName.toLowerCase();
        page = figma.root.children.find((p) => p.name.toLowerCase() === name);
        if (!page) page = figma.root.children.find((p) => p.name.toLowerCase().includes(name));
        if (!page) {
          const available = figma.root.children.map((p) => p.name);
          throw new Error(`Page not found: '${params.pageName}'. Available pages: [${available.join(", ")}]`);
        }
      }
      yield figma.setCurrentPageAsync(page);
      return { id: page.id, name: page.name };
    });
  }
  function createPage(params) {
    return __async(this, null, function* () {
      const name = (params == null ? void 0 : params.name) || "New Page";
      const page = figma.createPage();
      page.name = name;
      return { id: page.id };
    });
  }
  function renamePage(params) {
    return __async(this, null, function* () {
      if (!(params == null ? void 0 : params.newName)) throw new Error("Missing newName parameter");
      let page;
      if (params.pageId) {
        page = yield figma.getNodeByIdAsync(params.pageId);
        if (!page || page.type !== "PAGE") throw new Error(`Page not found: ${params.pageId}`);
      } else {
        page = figma.currentPage;
      }
      page.name = params.newName;
      return "ok";
    });
  }
  var figmaHandlers2 = {
    get_document_info: getDocumentInfo,
    get_current_page: getCurrentPage,
    set_current_page: setCurrentPage,
    create_page: createPage,
    rename_page: renamePage
  };

  // src/handlers/selection.ts
  function getSelection(params) {
    return __async(this, null, function* () {
      const sel = figma.currentPage.selection;
      if (sel.length === 0) {
        return { results: [] };
      }
      const depth = params == null ? void 0 : params.depth;
      const verbose = (params == null ? void 0 : params.verbose) === true;
      if (depth === void 0 || depth === null) {
        return {
          results: sel.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type
          }))
        };
      }
      const { serializeNode: serializeNode2, DEFAULT_NODE_BUDGET: DEFAULT_NODE_BUDGET2 } = yield Promise.resolve().then(() => (init_serialize_node(), serialize_node_exports));
      const budget = { remaining: DEFAULT_NODE_BUDGET2 };
      const results = [];
      for (const node of sel) {
        results.push(yield serializeNode2(node, depth, 0, budget, verbose));
      }
      const out = { results };
      if (budget.remaining <= 0) {
        out._truncated = true;
        out._notice = "Result was truncated (node budget exceeded). Use a shallower depth or read specific node IDs.";
      }
      return out;
    });
  }
  function setSelection(params) {
    return __async(this, null, function* () {
      const nodeIds = params == null ? void 0 : params.nodeIds;
      if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
        throw new Error("Missing or empty nodeIds");
      }
      const nodes = [];
      const notFound = [];
      for (const id of nodeIds) {
        const node = yield figma.getNodeByIdAsync(id);
        if (node) nodes.push(node);
        else notFound.push(id);
      }
      if (nodes.length === 0) throw new Error(`No valid nodes found: ${nodeIds.join(", ")}`);
      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
      return {
        count: nodes.length,
        selectedNodes: nodes.map((n) => ({ name: n.name, id: n.id })),
        notFoundIds: notFound.length > 0 ? notFound : void 0
      };
    });
  }
  var figmaHandlers3 = {
    get_selection: getSelection,
    set_selection: setSelection
  };

  // src/handlers/node-info.ts
  init_serialize_node();
  function pickFields(node, keep) {
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const key of Object.keys(node)) {
      if (keep.has(key) || key.startsWith("_")) {
        out[key] = key === "children" && Array.isArray(node.children) ? node.children.map((c) => pickFields(c, keep)) : node[key];
      }
    }
    return out;
  }
  function getNodeInfo(params) {
    return __async(this, null, function* () {
      const nodeIds = params.nodeIds || (params.nodeId ? [params.nodeId] : []);
      const depth = params.depth;
      const fields = params.fields;
      const verbose = params.verbose === true;
      const keep = (fields == null ? void 0 : fields.length) ? fields.includes("*") ? null : /* @__PURE__ */ new Set([...fields, "id", "name", "type", "children"]) : null;
      const budget = { remaining: DEFAULT_NODE_BUDGET };
      const results = [];
      for (const nodeId of nodeIds) {
        const node = yield figma.getNodeByIdAsync(nodeId);
        if (!node) {
          results.push({ nodeId, error: `Node not found: ${nodeId}` });
          continue;
        }
        let serialized = yield serializeNode(node, depth !== void 0 ? depth : -1, 0, budget, verbose);
        if (keep && serialized) serialized = pickFields(serialized, keep);
        results.push(serialized);
      }
      const out = { results };
      if (budget.remaining <= 0) {
        out._truncated = true;
        out._notice = "Result was truncated (node budget exceeded). Nodes with _truncated: true are stubs. To inspect them, call get_node_info with their IDs directly, or use a shallower depth.";
      }
      return out;
    });
  }
  function searchNodes(params) {
    return __async(this, null, function* () {
      if (!params) throw new Error("Missing parameters");
      let scopeNode;
      if (params.scopeNodeId) {
        scopeNode = yield figma.getNodeByIdAsync(params.scopeNodeId);
        if (!scopeNode) throw new Error(`Scope node not found: ${params.scopeNodeId}`);
      } else {
        yield figma.currentPage.loadAsync();
        scopeNode = figma.currentPage;
      }
      if (!("findAll" in scopeNode)) throw new Error("Scope node does not support searching");
      let results;
      if (params.types && !params.query) {
        results = scopeNode.findAllWithCriteria({ types: params.types });
      } else {
        results = scopeNode.findAll((node) => {
          var _a;
          if (((_a = params.types) == null ? void 0 : _a.length) && !params.types.includes(node.type)) return false;
          if (params.query) {
            const q = params.query.toLowerCase();
            return params.caseSensitive ? node.name.includes(params.query) : node.name.toLowerCase().includes(q);
          }
          return true;
        });
      }
      const totalCount = results.length;
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      results = results.slice(offset, offset + limit);
      return {
        totalCount,
        returned: results.length,
        offset,
        limit,
        results: results.map((node) => {
          const entry = { id: node.id, name: node.name, type: node.type };
          if (node.parent) {
            entry.parentId = node.parent.id;
            entry.parentName = node.parent.name;
          }
          if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
            entry.bounds = node.absoluteBoundingBox;
          } else if ("x" in node) {
            entry.x = node.x;
            entry.y = node.y;
            if ("width" in node) {
              entry.width = node.width;
              entry.height = node.height;
            }
          }
          return entry;
        })
      };
    });
  }
  function exportNodeAsImage(params) {
    return __async(this, null, function* () {
      var _a, _b;
      const { customBase64Encode: customBase64Encode2 } = yield Promise.resolve().then(() => (init_base64(), base64_exports));
      const nodeId = (_a = params == null ? void 0 : params.id) != null ? _a : params == null ? void 0 : params.nodeId;
      const scale = (_b = params == null ? void 0 : params.scale) != null ? _b : 1;
      const format = params.format || "PNG";
      if (!nodeId) throw new Error("Missing id");
      const node = yield figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      if (!("exportAsync" in node)) throw new Error(`Node does not support export: ${nodeId}`);
      if (format === "SVG_STRING") {
        const svg = yield node.exportAsync({ format: "SVG_STRING" });
        return { mimeType: "image/svg+xml", imageData: svg, isString: true };
      }
      const settings = { format };
      if (format === "PNG" || format === "JPG") {
        settings.constraint = { type: "SCALE", value: scale };
      }
      const bytes = yield node.exportAsync(settings);
      const mimeMap = {
        PNG: "image/png",
        JPG: "image/jpeg",
        SVG: "image/svg+xml",
        PDF: "application/pdf"
      };
      return {
        mimeType: mimeMap[format] || "application/octet-stream",
        imageData: customBase64Encode2(bytes)
      };
    });
  }
  var figmaHandlers4 = {
    get_node_info: getNodeInfo,
    // Legacy single-node alias
    get_nodes_info: (params) => __async(null, null, function* () {
      return getNodeInfo({ nodeIds: params.nodeIds, depth: params.depth });
    }),
    search_nodes: searchNodes,
    export_node_as_image: exportNodeAsImage
  };

  // src/handlers/helpers.ts
  init_serialize_node();
  function hintKey(h) {
    return h.message.replace(/'[^']*'/g, "'\u2026'").replace(/"[^"]*"/g, '"\u2026"').replace(/\([^)]*\)/g, "(\u2026)").replace(/\[[^\]]*\]/g, "[\u2026]");
  }
  function nodeSnapshot(id, depth) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(id);
      if (!node) return null;
      const budget = { remaining: DEFAULT_NODE_BUDGET };
      const result = yield serializeNode(node, depth, 0, budget);
      if (budget.remaining <= 0) {
        result._truncated = true;
        result._notice = "Snapshot truncated (node budget exceeded). Nodes with _truncated: true are stubs. Call get_node_info with their IDs to inspect, or use a shallower depth.";
      }
      return result;
    });
  }
  function sendBatchProgress(commandId, processed, total, status) {
    const progress = Math.round(processed / total * 100);
    figma.ui.postMessage({
      type: "command_progress",
      commandId,
      commandType: "batch",
      status,
      progress,
      totalItems: total,
      processedItems: processed,
      message: `Processing ${processed}/${total} items`,
      timestamp: Date.now()
    });
  }
  var TEXT_ALIAS_KEYS = /* @__PURE__ */ new Set(["fills", "fontColor"]);
  var FRAME_ALIAS_KEYS = /* @__PURE__ */ new Set(["fills", "strokes"]);
  function normalizeAliases(p, keys) {
    const hasFills = !keys || keys.has("fills");
    const hasFontColor = !keys || keys.has("fontColor");
    const hasStrokes = !keys || keys.has("strokes");
    if (hasFills && !p.fills) {
      const colorAlias = p.color !== void 0 && !hasFontColor ? "color" : p.backgroundColor !== void 0 ? "backgroundColor" : p.background !== void 0 ? "background" : null;
      if (colorAlias) {
        p.fillColor = p[colorAlias];
        delete p[colorAlias];
      }
      if (hasFontColor) {
        if (p.fontColorVariableId !== void 0) {
          p.fills = { _variableId: p.fontColorVariableId };
          delete p.fontColorVariableId;
        } else if (p.fontColorVariableName !== void 0) {
          p.fills = { _variable: p.fontColorVariableName };
          delete p.fontColorVariableName;
        } else if (p.fontColorStyleName !== void 0) {
          p.fills = { _style: p.fontColorStyleName };
          delete p.fontColorStyleName;
        } else if (p.fontColor !== void 0) {
          const c = coerceColor(p.fontColor);
          p.fills = c ? [solidPaint(c)] : p.fontColor;
          delete p.fontColor;
        }
      }
      if (!p.fills && p.fillVariableName !== void 0) {
        p.fills = { _variable: p.fillVariableName };
        delete p.fillVariableName;
      } else if (!p.fills && p.fillStyleName !== void 0) {
        p.fills = { _style: p.fillStyleName, _styleKey: p._fillStyleKey };
        delete p.fillStyleName;
        delete p._fillStyleKey;
      } else if (!p.fills && p.fillColor !== void 0) {
        const c = coerceColor(p.fillColor);
        p.fills = c ? [solidPaint(c)] : p.fillColor;
        delete p.fillColor;
      }
    }
    if (hasStrokes && !p.strokes) {
      if (p.strokeVariableName !== void 0) {
        p.strokes = { _variable: p.strokeVariableName };
        delete p.strokeVariableName;
      } else if (p.strokeStyleName !== void 0) {
        p.strokes = { _style: p.strokeStyleName, _styleKey: p._strokeStyleKey };
        delete p.strokeStyleName;
        delete p._strokeStyleKey;
      } else if (p.strokeColor !== void 0) {
        const c = coerceColor(p.strokeColor);
        p.strokes = c ? [solidPaint(c)] : p.strokeColor;
        delete p.strokeColor;
      }
    }
  }
  function batchHandler(params, fn, guard) {
    return __async(this, null, function* () {
      var _a;
      const items = params.items || [params];
      const depth = params.depth;
      const commandId = params.commandId;
      const useProgress = items.length > 3 && commandId;
      if (useProgress) sendBatchProgress(commandId, 0, items.length, "started");
      const results = [];
      const allHints = [];
      for (let i = 0; i < items.length; i++) {
        try {
          if (params._caps) items[i]._caps = params._caps;
          if (guard && ((_a = items[i].children) == null ? void 0 : _a.length)) {
            items[i]._originalParams = JSON.parse(JSON.stringify(items[i]));
          }
          if (guard) {
            normalizeAliases(items[i], guard.keys);
            rejectUnknownParams(items[i], guard.keys, guard.help);
          }
          let result = yield fn(items[i]);
          if (depth !== void 0 && (result == null ? void 0 : result.id)) {
            const snapshot = yield nodeSnapshot(result.id, depth);
            if (snapshot) result = __spreadValues(__spreadValues({}, result), snapshot);
          }
          if (result == null ? void 0 : result.hints) {
            allHints.push(...result.hints);
            delete result.hints;
          }
          if (result && typeof result === "object" && Object.keys(result).length === 0) {
            results.push("ok");
          } else {
            results.push(result);
          }
        } catch (e) {
          results.push({ error: e.message });
        }
        if (useProgress && (i + 1) % 3 === 0) {
          sendBatchProgress(commandId, i + 1, items.length, "in_progress");
        }
      }
      if (useProgress) sendBatchProgress(commandId, items.length, items.length, "completed");
      const out = { results };
      const warnings = [];
      const grouped = /* @__PURE__ */ new Map();
      const hardcodedColors = /* @__PURE__ */ new Set();
      const HARDCODED_COLOR_RE = /^Hardcoded color (#[0-9a-f]{6,8})/i;
      for (const hint of allHints) {
        if (hint.type === "confirm") continue;
        if (hint.type === "error") {
          warnings.push(hint.message);
        } else {
          const colorMatch = hint.message.match(HARDCODED_COLOR_RE);
          if (colorMatch) {
            hardcodedColors.add(colorMatch[1]);
            continue;
          }
          const key = hintKey(hint);
          const entry = grouped.get(key);
          if (entry) entry.count++;
          else grouped.set(key, { count: 1, example: hint.message });
        }
      }
      for (const [, { count, example }] of grouped) {
        warnings.push(count > 1 ? `(\xD7${count}) ${example}` : example);
      }
      if (hardcodedColors.size > 0) {
        const colors = [...hardcodedColors].join(", ");
        warnings.push(`Hardcoded colors without design tokens: [${colors}]. Create variables with variables(method:"create"), then bind with fillVariableName/strokeVariableName.`);
      }
      if (warnings.length > 0) out.warnings = warnings;
      return out;
    });
  }
  function appendToParent(node, parentId) {
    return __async(this, null, function* () {
      if (parentId) {
        const parent = yield figma.getNodeByIdAsync(parentId);
        if (!parent) throw new Error(`Parent not found: ${parentId}`);
        if (!("appendChild" in parent))
          throw new Error(`Parent does not support children: ${parentId}. Only FRAME, COMPONENT, GROUP, SECTION, SLOT, and PAGE nodes can have children.`);
        parent.appendChild(node);
        return parent;
      }
      figma.currentPage.appendChild(node);
      return figma.currentPage;
    });
  }
  function checkParentOverflow(parent, hints) {
    if (!parent || parent.type === "PAGE") return;
    const p = parent;
    if (!p.layoutMode || p.layoutMode === "NONE") return;
    if (p.overflowDirection && p.overflowDirection !== "NONE") return;
    if (!("children" in p)) return;
    const isH = p.layoutMode === "HORIZONTAL";
    const primarySizing = isH ? p.layoutSizingHorizontal : p.layoutSizingVertical;
    if (primarySizing !== "FIXED") return;
    const padStart = isH ? p.paddingLeft || 0 : p.paddingTop || 0;
    const padEnd = isH ? p.paddingRight || 0 : p.paddingBottom || 0;
    const primaryInner = (isH ? p.width : p.height) - padStart - padEnd;
    if (primaryInner <= 0) return;
    const children = p.children;
    const spacing = p.itemSpacing || 0;
    const concreteChildren = children.filter(
      (c) => "width" in c && (isH ? c.layoutSizingHorizontal : c.layoutSizingVertical) !== "FILL"
    );
    if (concreteChildren.length === 0) return;
    const totalConcrete = concreteChildren.reduce((sum, c) => sum + (isH ? c.width : c.height), 0);
    const totalSpacing = Math.max(0, children.length - 1) * spacing;
    const totalUsed = totalConcrete + totalSpacing;
    if (totalUsed > primaryInner) {
      const axis = isH ? "width" : "height";
      const scrollDir = isH ? "HORIZONTAL" : "VERTICAL";
      hints.push({
        type: "warn",
        message: `Children overflow ${p.name} on ${axis}: ${Math.round(totalUsed)} used vs ${Math.round(primaryInner)} available. Content will be clipped. Set overflowDirection:"${scrollDir}" for scrollable content, or use layoutSizingVertical/Horizontal:"HUG" so the frame grows to fit.`
      });
    }
  }
  function applySizing(node, parent, p, hints, autoDefault = true) {
    var _a, _b;
    const parentIsAL = parent && "layoutMode" in parent && parent.layoutMode !== "NONE";
    const nodeHasLayoutMode = "layoutMode" in node;
    let nodeIsAL = nodeHasLayoutMode && node.layoutMode !== "NONE";
    const parentDir = parentIsAL ? parent.layoutMode : null;
    const parentSizingH = parentIsAL ? parent.layoutSizingHorizontal : null;
    const parentSizingV = parentIsAL ? parent.layoutSizingVertical : null;
    function inferAxis(field, explicit, dimension) {
      if (explicit) {
        if (dimension !== void 0 && (explicit === "HUG" || explicit === "FILL")) {
          const dim = field === "layoutSizingHorizontal" ? "width" : "height";
          const behavior = explicit === "HUG" ? "node will shrink to content" : "node will stretch to fill parent";
          hints.push({ type: "warn", message: `${dim}: ${dimension} ignored \u2014 ${field} is "${explicit}" (${behavior}). Set ${field}: "FIXED" to use the explicit ${dim}.` });
        }
        return { value: explicit, inferred: false };
      }
      if (dimension !== void 0) return { value: "FIXED", inferred: false };
      if (!autoDefault) return { value: void 0, inferred: false };
      if (parentIsAL) {
        const isH = field === "layoutSizingHorizontal";
        const isCrossAxis = parentDir === "HORIZONTAL" ? !isH : isH;
        if (isCrossAxis) {
          const parentCross = isH ? parentSizingH : parentSizingV;
          if (parentCross === "HUG") {
            return { value: "HUG", inferred: true, reason: "parent hugs on this axis" };
          }
          const crossAlign = parent.counterAxisAlignItems;
          if (crossAlign === "CENTER" || crossAlign === "MAX" || crossAlign === "BASELINE") {
            return {
              value: "HUG",
              inferred: true,
              reason: `parent aligns children ${crossAlign} on cross-axis \u2014 FILL would override that`
            };
          }
          return { value: "FILL", inferred: true, reason: "stretch to fill parent" };
        }
        return { value: "HUG", inferred: true, reason: "shrink to content along flow" };
      }
      if (nodeIsAL) return { value: "HUG", inferred: true, reason: "shrink to content" };
      if (nodeHasLayoutMode) return { value: "HUG", inferred: true, reason: "shrink to content" };
      return { value: void 0, inferred: false };
    }
    const hAxis = inferAxis("layoutSizingHorizontal", p.layoutSizingHorizontal, p.width);
    const vAxis = inferAxis("layoutSizingVertical", p.layoutSizingVertical, p.height);
    const axes = [
      __spreadValues({ field: "layoutSizingHorizontal" }, hAxis),
      __spreadValues({ field: "layoutSizingVertical" }, vAxis)
    ];
    for (const axis of axes) {
      let { value } = axis;
      const { field, inferred, reason } = axis;
      if (!value) continue;
      if (!(field in node)) {
        hints.push({ type: "warn", message: `${field} not supported on ${node.type} \u2014 ignored. Sizing only applies to frames, components, instances, and text.` });
        continue;
      }
      if (value === "FILL" && !parentIsAL) {
        const parentDesc = parent ? `parent "${parent.name || parent.id}"` : "parent";
        hints.push({ type: "warn", message: `${field}:'FILL' requires an auto-layout parent \u2014 using HUG instead. Set ${parentDesc}'s layoutMode to enable auto-layout for FILL.` });
        value = "HUG";
      }
      if ((value === "FILL" || value === "HUG") && "layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE") {
        hints.push({ type: "warn", message: `${field}:'${value}' has no effect on absolutely positioned nodes \u2014 use explicit width/height instead.` });
      }
      if (value === "HUG") {
        const isTextInAL = node.type === "TEXT" && parentIsAL;
        if (!nodeIsAL && !isTextInAL) {
          if (nodeHasLayoutMode) {
            node.layoutMode = "VERTICAL";
            nodeIsAL = true;
            hints.push({ type: "suggest", message: `${field}:'HUG' requires auto-layout \u2014 enabled layoutMode:'VERTICAL'.` });
          } else {
            throw new Error(`${field}:'HUG' is not supported on ${node.type} outside auto-layout. Place this node inside an auto-layout parent (set parentId to an auto-layout frame).`);
          }
        }
      }
      node[field] = value;
      if (value === "FILL" && !inferred && parentIsAL) {
        const isH = field === "layoutSizingHorizontal";
        const isCrossAxis = parentDir === "HORIZONTAL" ? !isH : isH;
        if (isCrossAxis) {
          const crossAlign = parent.counterAxisAlignItems;
          if (crossAlign === "CENTER" || crossAlign === "MAX" || crossAlign === "BASELINE") {
            hints.push({ type: "warn", message: `${field}:'FILL' overrides parent's counterAxisAlignItems:'${crossAlign}' \u2014 this node will stretch to full width instead of being aligned. Use 'HUG' to respect ${crossAlign} alignment.` });
          }
        }
      }
      if (inferred) {
        const dim = field === "layoutSizingHorizontal" ? "width" : "height";
        hints.push({ type: "suggest", message: `No ${dim} specified \u2014 defaulted to ${field}:'${value}' (${reason}).` });
      }
    }
    if (parentIsAL) {
      if (node.layoutSizingHorizontal === "FIXED" && node.layoutSizingVertical === "FIXED") {
        const w = (_a = node.width) != null ? _a : 0;
        const h = (_b = node.height) != null ? _b : 0;
        if (w >= 100 && h >= 100) {
          hints.push({ type: "warn", message: "Child has FIXED sizing on both axes inside auto-layout parent. Consider 'FILL' or 'HUG' for responsive layout." });
        }
      }
    }
    if (!autoDefault && parentIsAL) {
      const isHorizontal = parentDir === "HORIZONTAL";
      const crossField = isHorizontal ? "layoutSizingVertical" : "layoutSizingHorizontal";
      const crossExplicit = isHorizontal ? p.layoutSizingVertical : p.layoutSizingHorizontal;
      const crossAlign = parent.counterAxisAlignItems;
      const parentAligns = crossAlign === "CENTER" || crossAlign === "MAX" || crossAlign === "BASELINE";
      if (!crossExplicit && !parentAligns && crossField in node) {
        const current = node[crossField];
        if (current === "HUG" || current === "FIXED") {
          hints.push({ type: "suggest", message: `${crossField} is '${current}' inside auto-layout parent. Consider '${crossField}:"FILL"' to fill available space.` });
        }
      }
    }
  }
  function warnCrossAxisHug(node, parent, hints, label = "") {
    if (!parent || !("layoutMode" in parent) || parent.layoutMode === "NONE") return;
    const parentAL = parent;
    const isHorizontal = parentAL.layoutMode === "HORIZONTAL";
    const crossAlign = parentAL.counterAxisAlignItems;
    if (crossAlign === "CENTER" || crossAlign === "MAX" || crossAlign === "BASELINE") return;
    const parentCross = isHorizontal ? parentAL.layoutSizingVertical : parentAL.layoutSizingHorizontal;
    const childCross = isHorizontal ? node.layoutSizingVertical : node.layoutSizingHorizontal;
    if ((parentCross === "FIXED" || parentCross === "FILL") && childCross === "HUG") {
      const crossProp = isHorizontal ? "layoutSizingVertical" : "layoutSizingHorizontal";
      const prefix = label ? `${label} has ` : "";
      hints.push({ type: "warn", message: `${prefix}HUG on cross-axis of constrained parent \u2014 won't fill available space. Use ${crossProp}:"FILL".` });
    }
  }
  function appendAndApplySizing(node, p, hints, autoDefault = true) {
    return __async(this, null, function* () {
      for (const field of ["layoutSizingHorizontal", "layoutSizingVertical"]) {
        const value = p[field];
        if (value === "FIXED" && field in node) node[field] = value;
      }
      const parent = yield appendToParent(node, p.parentId);
      applySizing(node, parent, p, hints, autoDefault);
      checkParentOverflow(parent, hints);
      return parent;
    });
  }
  function checkOverlappingSiblings(node, parent, hints) {
    if (!parent || !("children" in parent)) return;
    const parentIsAL = "layoutMode" in parent && parent.layoutMode !== "NONE";
    if (parentIsAL) return;
    const siblings = parent.children;
    const nx = Math.round(node.x), ny = Math.round(node.y);
    const overlapping = siblings.filter(
      (s) => s.id !== node.id && "x" in s && "y" in s && Math.round(s.x) === nx && Math.round(s.y) === ny
    );
    if (overlapping.length > 0) {
      hints.push({ type: "warn", message: `Overlapping sibling(s) at (${nx},${ny}): [${overlapping.map((s) => s.name).join(", ")}]. Set distinct x/y or convert parent to auto-layout.` });
    }
  }
  function isSmallIntrinsic(node) {
    var _a;
    const bb = (_a = node.absoluteBoundingBox) != null ? _a : node;
    const children = "children" in node ? node.children : [];
    return bb.width < 100 || bb.height < 100 || children.length < 3;
  }
  function coerceColor(v) {
    var _a, _b, _c, _d;
    if (typeof v === "object" && v !== null && "r" in v) {
      return { r: (_a = v.r) != null ? _a : 0, g: (_b = v.g) != null ? _b : 0, b: (_c = v.b) != null ? _c : 0, a: (_d = v.a) != null ? _d : 1 };
    }
    if (typeof v !== "string") return null;
    const m = v.match(/^#?([0-9a-f]{3,8})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  function solidPaint(c) {
    var _a, _b, _c, _d;
    return { type: "SOLID", color: { r: (_a = c.r) != null ? _a : 0, g: (_b = c.g) != null ? _b : 0, b: (_c = c.b) != null ? _c : 0 }, opacity: (_d = c.a) != null ? _d : 1 };
  }
  function findVariableById(id) {
    return __async(this, null, function* () {
      const direct = yield figma.variables.getVariableByIdAsync(id);
      if (direct) return direct;
      const all = yield figma.variables.getLocalVariablesAsync();
      return all.find((v) => v.id === id) || null;
    });
  }
  function resolveVariable(name, typeFilter, collectionName, scopeContext) {
    return __async(this, null, function* () {
      const all = typeFilter ? yield figma.variables.getLocalVariablesAsync(typeFilter) : yield figma.variables.getLocalVariablesAsync();
      let matches = all.filter((v) => v.name === name);
      if (matches.length === 0) {
        const lower = name.toLowerCase();
        matches = all.filter((v) => v.name.toLowerCase() === lower);
      }
      if (matches.length === 0 && !collectionName && name.includes("/")) {
        const slashIdx = name.indexOf("/");
        return resolveVariable(name.substring(slashIdx + 1), typeFilter, name.substring(0, slashIdx), scopeContext);
      }
      if (matches.length === 0) return null;
      if (collectionName) {
        const collections = yield figma.variables.getLocalVariableCollectionsAsync();
        const col = collections.find((c) => c.name === collectionName) || collections.find((c) => c.name.toLowerCase() === collectionName.toLowerCase());
        if (!col) return null;
        return matches.find((v) => v.variableCollectionId === col.id) || null;
      }
      if (matches.length > 1 && scopeContext) {
        const scoped = matches.filter((v) => {
          const scopes = v.scopes || [];
          return scopes.includes(scopeContext);
        });
        if (scoped.length === 1) return scoped[0];
        const allScope = matches.filter((v) => {
          const scopes = v.scopes || [];
          return scopes.length === 0 || scopes.includes("ALL_SCOPES");
        });
        if (allScope.length === 1) return allScope[0];
      }
      if (matches.length > 1) {
        const collections = yield figma.variables.getLocalVariableCollectionsAsync();
        const colNames = matches.map((v) => {
          var _a;
          return ((_a = collections.find((c) => c.id === v.variableCollectionId)) == null ? void 0 : _a.name) || "?";
        });
        throw new Error(`Variable '${name}' exists in multiple collections: [${colNames.join(", ")}]. Use "CollectionName/${name}" to disambiguate.`);
      }
      return matches[0];
    });
  }
  function findVariableByName(name, collectionName, scopeContext) {
    return __async(this, null, function* () {
      return resolveVariable(name, void 0, collectionName, scopeContext);
    });
  }
  function findColorVariableByName(name, collectionName) {
    return __async(this, null, function* () {
      return resolveVariable(name, "COLOR", collectionName);
    });
  }
  function styleNotFoundHint(param, value, available, limit = 20) {
    if (available.length === 0) return { type: "error", message: `${param} '${value}' not found (no local styles of this type exist).` };
    const names = available.slice(0, limit);
    const suffix = available.length > limit ? `, \u2026 and ${available.length - limit} more` : "";
    return { type: "error", message: `${param} '${value}' not found. Available: [${names.join(", ")}${suffix}]` };
  }
  function resolveTextStylesForBatch(items) {
    return __async(this, null, function* () {
      const byName = /* @__PURE__ */ new Map();
      const fontsToLoad = [];
      const needsResolve = items.some((p) => p.textStyleName && !p.textStyleId);
      if (!needsResolve) return { byName, fontsToLoad, localStyles: [] };
      const localStyles = yield figma.getLocalTextStylesAsync();
      for (const p of items) {
        if (!p.textStyleName || p.textStyleId) continue;
        const name = p.textStyleName;
        if (byName.has(name)) continue;
        const exact = localStyles.find((s) => s.name === name);
        if (exact) {
          byName.set(name, exact);
          if (exact.fontName) fontsToLoad.push(exact.fontName);
          continue;
        }
      }
      const MAX_LIBRARY_IMPORTS = 3;
      const pendingImports = [];
      for (const p of items) {
        if (!p.textStyleName || p.textStyleId) continue;
        const name = p.textStyleName;
        if (byName.has(name)) continue;
        if (!p._textStyleKey) continue;
        if (pendingImports.some((i) => i.name === name)) continue;
        pendingImports.push({ name, key: p._textStyleKey });
      }
      for (const { name, key } of pendingImports.slice(0, MAX_LIBRARY_IMPORTS)) {
        try {
          const style = yield Promise.race([
            figma.importStyleByKeyAsync(key),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2e3))
          ]);
          if (style && style.type === "TEXT") {
            byName.set(name, style);
            if (style.fontName) fontsToLoad.push(style.fontName);
          }
        } catch (e) {
        }
      }
      for (const p of items) {
        if (!p.textStyleName || p.textStyleId) continue;
        const name = p.textStyleName;
        if (byName.has(name)) continue;
        const fuzzy = localStyles.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
        if (fuzzy) {
          byName.set(name, fuzzy);
          if (fuzzy.fontName) fontsToLoad.push(fuzzy.fontName);
        }
      }
      return { byName, fontsToLoad, localStyles };
    });
  }
  function suggestStyleForColor(color, styleParam, bindingContext) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      const hex = `#${[color.r, color.g, color.b].map((v) => Math.round((v != null ? v : 0) * 255).toString(16).padStart(2, "0")).join("")}`;
      const eps = 0.02;
      const cr = (_a = color.r) != null ? _a : 0, cg = (_b = color.g) != null ? _b : 0, cb = (_c = color.b) != null ? _c : 0, ca = (_d = color.a) != null ? _d : 1;
      const colorMatches = (vc) => {
        var _a2;
        return Math.abs(vc.r - cr) < eps && Math.abs(vc.g - cg) < eps && Math.abs(vc.b - cb) < eps && Math.abs(((_a2 = vc.a) != null ? _a2 : 1) - ca) < eps;
      };
      const colorVars = yield figma.variables.getLocalVariablesAsync("COLOR");
      if (colorVars.length > 0) {
        const collections = yield figma.variables.getLocalVariableCollectionsAsync();
        const defaultModes = new Map(collections.map((c) => [c.id, c.defaultModeId]));
        let best = null;
        for (const v of colorVars) {
          const modeId = defaultModes.get(v.variableCollectionId);
          if (!modeId) continue;
          const val = v.valuesByMode[modeId];
          if (!val || typeof val !== "object" || "type" in val) continue;
          if (!colorMatches(val)) continue;
          const scopes = v.scopes || [];
          if (bindingContext && scopes.includes(bindingContext)) {
            best = v;
            break;
          }
        }
        if (best) {
          return {
            hint: { type: "confirm", message: `Auto-bound color ${hex} \u2192 variable '${best.name}'.` },
            variable: best
          };
        }
      }
      const styles = yield figma.getLocalPaintStylesAsync();
      for (const style of styles) {
        const paints = style.paints;
        if (paints.length === 1 && paints[0].type === "SOLID") {
          const sc = paints[0].color;
          const so = (_e = paints[0].opacity) != null ? _e : 1;
          if (Math.abs(sc.r - cr) < eps && Math.abs(sc.g - cg) < eps && Math.abs(sc.b - cb) < eps && Math.abs(so - ca) < eps) {
            return {
              hint: { type: "confirm", message: `Auto-bound color ${hex} \u2192 style '${style.name}'.` },
              paintStyleId: style.id
            };
          }
        }
      }
      const scopeHint = bindingContext ? ` with scopes: [${bindingContext}]` : "";
      return { hint: { type: "suggest", message: `Hardcoded color ${hex} has no matching color variable${scopeHint} or paint style. Create one with variables(method: "create"${scopeHint}) or styles(method: "create", type: "paint"), then use ${styleParam} for design token consistency.` } };
    });
  }
  var WRONG_SHAPE_CORRECTIONS = {
    // fills: handled by batchHandler normalization — not rejected
    // strokes: handled by batchHandler normalization — not rejected
    color: `"color" is ambiguous on text nodes. Use fills: [{type:"SOLID", color:"#hex"}] for text color, or fontColor: "#hex" as shorthand.`,
    border: `"border" is not a valid param. Use strokeColor: "#hex", strokeWeight: 1`,
    borderColor: `"borderColor" is not a valid param. Use strokeColor: "#hex" or strokeVariableName: "border/default"`,
    borderWidth: `"borderWidth" is not a valid param. Use strokeWeight: 1 (number or variable name string)`,
    borderRadius: `"borderRadius" is not a valid param. Use cornerRadius: 8 (number or variable name string). Per-corner: topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius`,
    radius: `"radius" is not a valid param. Use cornerRadius: 8 (number or variable name string)`,
    font: `"font" is not a valid param. Use fontFamily: "Inter" and fontStyle: "Bold" (or fontWeight: 700)`,
    text: `"text" is not a valid param on frames. For text nodes, use text(method: "create", items: [{text: "Hello", parentId: "<frameId>"}])`,
    content: `"content" is not a valid param. For text nodes, use text(method: "create", items: [{text: "Hello"}])`,
    label: `"label" is not a valid param. For text nodes, use text(method: "create", items: [{text: "Hello", parentId: "<frameId>"}])`,
    gap: `"gap" is not a valid param. Use itemSpacing: 8 (number or variable name string) for spacing between children`,
    spacing: `"spacing" is not a valid param. Use itemSpacing: 8 for spacing between children, or padding: 16 for inner padding`,
    alignItems: `"alignItems" is not a valid param. Use counterAxisAlignItems: "CENTER" (MIN | MAX | CENTER | BASELINE)`,
    justifyContent: `"justifyContent" is not a valid param. Use primaryAxisAlignItems: "CENTER" (MIN | MAX | CENTER | SPACE_BETWEEN)`,
    direction: `"direction" is not a valid param. Use layoutMode: "HORIZONTAL" or "VERTICAL"`,
    display: `"display" is not a valid param. Use layoutMode: "HORIZONTAL" or "VERTICAL" for auto-layout, or "NONE" for static frames`,
    fontWeight: `"fontWeight" is not supported here. Use fontStyle with the variant name, for example fontStyle: "Bold" or "SemiBold" (use fonts.list to find available variants for your font family).`
  };
  function rejectUnknownParams(p, knownKeys, helpCmd) {
    const unknown = [];
    const corrections = [];
    for (const key of Object.keys(p)) {
      if (knownKeys.has(key) || key.startsWith("_")) continue;
      const correction = WRONG_SHAPE_CORRECTIONS[key];
      if (correction) {
        corrections.push(correction);
      } else {
        unknown.push(key);
      }
    }
    if (corrections.length > 0) {
      throw new Error(corrections.join("\n\n"));
    }
    if (unknown.length > 0) {
      throw new Error(
        `Unknown params: ${unknown.join(", ")}. Use ${helpCmd} to see valid params and examples.`
      );
    }
  }
  function applyImageFill(node, p, hints) {
    return __async(this, null, function* () {
      var _a;
      if (p._svgMarkup) {
        try {
          const svgNode = figma.createNodeFromSvg(p._svgMarkup);
          if ("children" in node) {
            const targetW = node.width;
            const targetH = node.height;
            const svgW = svgNode.width;
            const svgH = svgNode.height;
            if (targetW && targetH && (svgW !== targetW || svgH !== targetH)) {
              const scale = Math.min(targetW / svgW, targetH / svgH);
              svgNode.rescale(scale);
            }
            for (const child of [...svgNode.children]) node.appendChild(child);
            svgNode.remove();
          } else {
            svgNode.x = node.x;
            svgNode.y = node.y;
            svgNode.name = node.name;
            if (node.parent) node.parent.appendChild(svgNode);
            node.remove();
          }
          return true;
        } catch (e) {
          hints.push({ type: "error", message: `Failed to insert SVG: ${e.message}` });
          return false;
        }
      }
      if (!p._imageData) return false;
      try {
        const { customBase64Decode: customBase64Decode2 } = yield Promise.resolve().then(() => (init_base64(), base64_exports));
        const bytes = customBase64Decode2(p._imageData);
        const image = figma.createImage(bytes);
        const scaleMode = (_a = p.imageScaleMode) != null ? _a : "FILL";
        node.fills = [{
          type: "IMAGE",
          scaleMode,
          imageHash: image.hash
        }];
        if (p._attribution) {
          node.name = `${node.name} \u2014 ${p._attribution}`;
          hints.push({ type: "suggest", message: p._attribution });
        }
        return true;
      } catch (e) {
        hints.push({ type: "error", message: `Failed to apply image fill: ${e.message}` });
        return false;
      }
    });
  }
  function applyFillWithAutoBind(node, p, hints) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      if (p.fills === void 0) return false;
      if ((_a = p.fills) == null ? void 0 : _a._variableId) {
        const v2 = yield findVariableById(p.fills._variableId);
        if (v2) {
          if ("fillStyleId" in node && node.fillStyleId) try {
            yield node.setFillStyleIdAsync("");
          } catch (e) {
          }
          node.fills = [solidPaint({ r: 0, g: 0, b: 0 })];
          const bound = figma.variables.setBoundVariableForPaint(node.fills[0], "color", v2);
          node.fills = [bound];
          return true;
        }
        hints.push({ type: "error", message: `fillVariableId '${p.fills._variableId}' not found.` });
        return false;
      }
      if ((_b = p.fills) == null ? void 0 : _b._variable) {
        const name = p.fills._variable;
        const v2 = yield findColorVariableByName(name);
        if (v2) {
          if ("fillStyleId" in node && node.fillStyleId) try {
            yield node.setFillStyleIdAsync("");
          } catch (e) {
          }
          node.fills = [solidPaint({ r: 0, g: 0, b: 0 })];
          const bound = figma.variables.setBoundVariableForPaint(node.fills[0], "color", v2);
          node.fills = [bound];
          hints.push({ type: "confirm", message: `Bound fill \u2192 variable '${v2.name}'.` });
          return true;
        }
        const colorVars = yield figma.variables.getLocalVariablesAsync("COLOR");
        const names = colorVars.map((v3) => v3.name).slice(0, 20);
        hints.push({ type: "error", message: `fillVariableName '${name}' not found. Available: [${names.join(", ")}]` });
        return false;
      }
      if ((_c = p.fills) == null ? void 0 : _c._style) {
        const name = p.fills._style;
        const styleKey = p.fills._styleKey;
        const styles2 = yield figma.getLocalPaintStylesAsync();
        const exact2 = styles2.find((s) => s.name === name);
        const match = exact2 || styles2.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
        if (match) {
          try {
            yield node.setFillStyleIdAsync(match.id);
            return true;
          } catch (e) {
            hints.push({ type: "error", message: `fillStyleName '${name}' matched but failed to apply: ${e.message}` });
            return false;
          }
        }
        if (styleKey) {
          try {
            const style = yield figma.importStyleByKeyAsync(styleKey);
            yield node.setFillStyleIdAsync(style.id);
            return true;
          } catch (e) {
            hints.push({ type: "error", message: `fillStyleName '${name}' (library import) failed: ${e.message}. Ensure the source library is enabled for this file.` });
            return false;
          }
        }
        hints.push(styleNotFoundHint("fillStyleName", name, styles2.map((s) => s.name)));
        return false;
      }
      if (Array.isArray(p.fills) && p.fills.length === 0) {
        node.fills = [];
        return true;
      }
      if (Array.isArray(p.fills)) {
        for (const f of p.fills) {
          if (f.gradientHandlePositions) {
            hints.push({ type: "warn", message: `"gradientHandlePositions" is the REST API format. The plugin API uses gradientTransform: [[1,0,0],[0,1,0]] (2\xD73 matrix). The handle positions were ignored.` });
            break;
          }
        }
        node.fills = p.fills.map((f) => {
          var _a2, _b2;
          if (f.type === "SOLID" && f.color) {
            const c2 = coerceColor(f.color);
            if (c2) return { type: "SOLID", color: { r: c2.r, g: c2.g, b: c2.b }, opacity: (_b2 = (_a2 = f.opacity) != null ? _a2 : c2.a) != null ? _b2 : 1 };
          }
          const _c2 = f, { gradientHandlePositions: _ } = _c2, clean = __objRest(_c2, ["gradientHandlePositions"]);
          return clean;
        });
        if (p.fills.length === 1 && ((_d = node.fills[0]) == null ? void 0 : _d.type) === "SOLID") {
          const sc = node.fills[0].color;
          const match = yield suggestStyleForColor(__spreadProps(__spreadValues({}, sc), { a: (_e = node.fills[0].opacity) != null ? _e : 1 }), "fillStyleName", "ALL_FILLS");
          if (match.variable) {
            const bound = figma.variables.setBoundVariableForPaint(node.fills[0], "color", match.variable);
            node.fills = [bound];
          } else if (match.paintStyleId) {
            try {
              yield node.setFillStyleIdAsync(match.paintStyleId);
            } catch (e) {
            }
          }
          hints.push(match.hint);
        }
        return true;
      }
      const c = coerceColor(p.fills);
      if (c) {
        node.fills = [solidPaint(c)];
        const match = yield suggestStyleForColor(c, "fillStyleName", "ALL_FILLS");
        if (match.variable) {
          const bound = figma.variables.setBoundVariableForPaint(node.fills[0], "color", match.variable);
          node.fills = [bound];
        } else if (match.paintStyleId) {
          try {
            yield node.setFillStyleIdAsync(match.paintStyleId);
          } catch (e) {
          }
        }
        hints.push(match.hint);
        return true;
      }
      const styles = yield figma.getLocalPaintStylesAsync();
      const exact = styles.find((s) => s.name === p.fills);
      const styleMatch = exact || styles.find((s) => s.name.toLowerCase() === String(p.fills).toLowerCase());
      if (styleMatch) {
        try {
          yield node.setFillStyleIdAsync(styleMatch.id);
          hints.push({ type: "confirm", message: `fills '${p.fills}' resolved as paint style '${styleMatch.name}'. Use fillStyleName for clarity.` });
          return true;
        } catch (e) {
          hints.push({ type: "error", message: `fills '${p.fills}' matched style but failed: ${e.message}` });
          return false;
        }
      }
      const v = yield findColorVariableByName(String(p.fills));
      if (v) {
        node.fills = [solidPaint({ r: 0, g: 0, b: 0 })];
        const bound = figma.variables.setBoundVariableForPaint(node.fills[0], "color", v);
        node.fills = [bound];
        hints.push({ type: "confirm", message: `fills '${p.fills}' resolved as color variable '${v.name}'. Use fillVariableName for clarity.` });
        return true;
      }
      hints.push({ type: "error", message: `fills '${p.fills}' is not a valid color (hex or {r,g,b}), paint style, or color variable.` });
      return false;
    });
  }
  function applyStrokeWithAutoBind(node, p, hints) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      if (p.strokes !== void 0) {
        if ((_a = p.strokes) == null ? void 0 : _a._variableId) {
          const v = yield findVariableById(p.strokes._variableId);
          if (v) {
            if ("strokeStyleId" in node && node.strokeStyleId) try {
              yield node.setStrokeStyleIdAsync("");
            } catch (e) {
            }
            node.strokes = [solidPaint({ r: 0, g: 0, b: 0 })];
            const bound = figma.variables.setBoundVariableForPaint(node.strokes[0], "color", v);
            node.strokes = [bound];
          } else {
            hints.push({ type: "error", message: `strokeVariableId '${p.strokes._variableId}' not found.` });
          }
        } else if ((_b = p.strokes) == null ? void 0 : _b._variable) {
          const name = p.strokes._variable;
          const v = yield findColorVariableByName(name);
          if (v) {
            if ("strokeStyleId" in node && node.strokeStyleId) try {
              yield node.setStrokeStyleIdAsync("");
            } catch (e) {
            }
            node.strokes = [solidPaint({ r: 0, g: 0, b: 0 })];
            const bound = figma.variables.setBoundVariableForPaint(node.strokes[0], "color", v);
            node.strokes = [bound];
            hints.push({ type: "confirm", message: `Bound stroke \u2192 variable '${v.name}'.` });
          } else {
            const colorVars = yield figma.variables.getLocalVariablesAsync("COLOR");
            const names = colorVars.map((v2) => v2.name).slice(0, 20);
            hints.push({ type: "error", message: `strokeVariableName '${name}' not found. Available: [${names.join(", ")}]` });
          }
        } else if ((_c = p.strokes) == null ? void 0 : _c._style) {
          const name = p.strokes._style;
          const styleKey = p.strokes._styleKey;
          const styles = yield figma.getLocalPaintStylesAsync();
          const exact = styles.find((s) => s.name === name);
          const match = exact || styles.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
          if (match) {
            try {
              yield node.setStrokeStyleIdAsync(match.id);
            } catch (e) {
              hints.push({ type: "error", message: `strokeStyleName '${name}' matched but failed to apply: ${e.message}` });
            }
          } else if (styleKey) {
            try {
              const style = yield figma.importStyleByKeyAsync(styleKey);
              yield node.setStrokeStyleIdAsync(style.id);
            } catch (e) {
              hints.push({ type: "error", message: `strokeStyleName '${name}' (library import) failed: ${e.message}` });
            }
          } else {
            hints.push(styleNotFoundHint("strokeStyleName", name, styles.map((s) => s.name)));
          }
        } else if (Array.isArray(p.strokes) && p.strokes.length === 0) {
          node.strokes = [];
        } else if (Array.isArray(p.strokes)) {
          for (const f of p.strokes) {
            if (f.gradientHandlePositions) {
              hints.push({ type: "warn", message: `"gradientHandlePositions" is the REST API format. The plugin API uses gradientTransform: [[1,0,0],[0,1,0]] (2\xD73 matrix). The handle positions were ignored.` });
              break;
            }
          }
          node.strokes = p.strokes.map((f) => {
            var _a2, _b2;
            if (f.type === "SOLID" && f.color) {
              const c = coerceColor(f.color);
              if (c) return { type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: (_b2 = (_a2 = f.opacity) != null ? _a2 : c.a) != null ? _b2 : 1 };
            }
            const _c2 = f, { gradientHandlePositions: _ } = _c2, clean = __objRest(_c2, ["gradientHandlePositions"]);
            return clean;
          });
          if (p.strokes.length === 1 && ((_d = node.strokes[0]) == null ? void 0 : _d.type) === "SOLID") {
            const sc = node.strokes[0].color;
            const match = yield suggestStyleForColor(__spreadProps(__spreadValues({}, sc), { a: (_e = node.strokes[0].opacity) != null ? _e : 1 }), "strokeStyleName", "STROKE_COLOR");
            if (match.variable) {
              const bound = figma.variables.setBoundVariableForPaint(node.strokes[0], "color", match.variable);
              node.strokes = [bound];
            } else if (match.paintStyleId) {
              try {
                yield node.setStrokeStyleIdAsync(match.paintStyleId);
              } catch (e) {
              }
            }
            hints.push(match.hint);
          }
        } else {
          const c = coerceColor(p.strokes);
          if (c) {
            node.strokes = [solidPaint(c)];
            const match = yield suggestStyleForColor(c, "strokeStyleName", "STROKE_COLOR");
            if (match.variable) {
              const bound = figma.variables.setBoundVariableForPaint(node.strokes[0], "color", match.variable);
              node.strokes = [bound];
            } else if (match.paintStyleId) {
              try {
                yield node.setStrokeStyleIdAsync(match.paintStyleId);
              } catch (e) {
              }
            }
            hints.push(match.hint);
          } else {
            const styles = yield figma.getLocalPaintStylesAsync();
            const exact = styles.find((s) => s.name === p.strokes);
            const styleMatch = exact || styles.find((s) => s.name.toLowerCase() === String(p.strokes).toLowerCase());
            if (styleMatch) {
              try {
                yield node.setStrokeStyleIdAsync(styleMatch.id);
                hints.push({ type: "confirm", message: `strokes '${p.strokes}' resolved as paint style '${styleMatch.name}'. Use strokeStyleName for clarity.` });
              } catch (e) {
                hints.push({ type: "error", message: `strokes '${p.strokes}' matched style but failed: ${e.message}` });
              }
            } else {
              const v = yield findColorVariableByName(String(p.strokes));
              if (v) {
                node.strokes = [solidPaint({ r: 0, g: 0, b: 0 })];
                const bound = figma.variables.setBoundVariableForPaint(node.strokes[0], "color", v);
                node.strokes = [bound];
                hints.push({ type: "confirm", message: `strokes '${p.strokes}' resolved as color variable '${v.name}'. Use strokeVariableName for clarity.` });
              } else {
                hints.push({ type: "error", message: `strokes '${p.strokes}' is not a valid color (hex or {r,g,b}), paint style, or color variable.` });
              }
            }
          }
        }
      }
      const swFields = {};
      for (const f of ["strokeWeight", "strokeTopWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeRightWeight"]) {
        if (p[f] !== void 0 && f in node) swFields[f] = p[f];
      }
      yield applyTokens(node, swFields, hints);
    });
  }
  function applyCornerRadius(node, p, hints) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      if (p.cornerRadius !== void 0) {
        (_a = p.topLeftRadius) != null ? _a : p.topLeftRadius = p.cornerRadius;
        (_b = p.topRightRadius) != null ? _b : p.topRightRadius = p.cornerRadius;
        (_c = p.bottomRightRadius) != null ? _c : p.bottomRightRadius = p.cornerRadius;
        (_d = p.bottomLeftRadius) != null ? _d : p.bottomLeftRadius = p.cornerRadius;
      }
      const fields = ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"];
      const hasPer = fields.some((f) => p[f] !== void 0);
      if (hasPer && "topLeftRadius" in node) {
        const cornerFields = {};
        for (const f of fields) {
          if (p[f] !== void 0) cornerFields[f] = p[f];
        }
        yield applyTokens(node, cornerFields, hints);
      } else if (p.cornerRadius !== void 0 && "cornerRadius" in node) {
        const bound = yield applyToken(node, "cornerRadius", p.cornerRadius, hints);
        if (!bound && p.cornerRadius !== 0) {
          hints.push({ type: "suggest", message: `Hardcoded cornerRadius. Use an existing FLOAT variable with scopes: [CORNER_RADIUS] or create one with variables(method:"create"), then pass the variable name string instead of a number.` });
        }
      }
    });
  }
  var FIELD_TO_SCOPE = {
    cornerRadius: "CORNER_RADIUS",
    topLeftRadius: "CORNER_RADIUS",
    topRightRadius: "CORNER_RADIUS",
    bottomRightRadius: "CORNER_RADIUS",
    bottomLeftRadius: "CORNER_RADIUS",
    itemSpacing: "GAP",
    counterAxisSpacing: "GAP",
    paddingTop: "GAP",
    paddingRight: "GAP",
    paddingBottom: "GAP",
    paddingLeft: "GAP",
    strokeWeight: "STROKE_FLOAT",
    strokeTopWeight: "STROKE_FLOAT",
    strokeBottomWeight: "STROKE_FLOAT",
    strokeLeftWeight: "STROKE_FLOAT",
    strokeRightWeight: "STROKE_FLOAT",
    opacity: "OPACITY"
  };
  function getFloatVarsWithModes() {
    return __async(this, null, function* () {
      const vars = yield figma.variables.getLocalVariablesAsync("FLOAT");
      const collections = yield figma.variables.getLocalVariableCollectionsAsync();
      const defaultModes = new Map(collections.map((c) => [c.id, c.defaultModeId]));
      return { vars, defaultModes };
    });
  }
  function matchFloatVariable(numericValue, field) {
    return __async(this, null, function* () {
      if (numericValue === 0) return null;
      const scope = FIELD_TO_SCOPE[field];
      if (!scope) return null;
      const { vars, defaultModes } = yield getFloatVarsWithModes();
      if (vars.length === 0) return null;
      for (const v of vars) {
        const modeId = defaultModes.get(v.variableCollectionId);
        if (!modeId) continue;
        const val = v.valuesByMode[modeId];
        if (typeof val !== "number") continue;
        if (val !== numericValue) continue;
        const scopes = v.scopes || [];
        if (scope && scopes.includes(scope)) {
          return v;
        }
      }
      return null;
    });
  }
  function applyToken(node, field, value, hints) {
    return __async(this, null, function* () {
      if (typeof value === "string") {
        const n = Number(value);
        if (!isNaN(n) && value.trim() !== "") {
          value = n;
        }
      }
      if (typeof value === "number") {
        const matched = yield matchFloatVariable(value, field);
        if (matched) {
          node.setBoundVariable(field, matched);
          hints.push({ type: "confirm", message: `Auto-bound ${field} ${value} \u2192 variable '${matched.name}'.` });
          return true;
        }
        node[field] = value;
        return false;
      }
      const scope = FIELD_TO_SCOPE[field];
      yield bindNumericVariable(node, field, value, hints, scope);
      return true;
    });
  }
  function applyTokens(node, fields, hints) {
    return __async(this, null, function* () {
      const hardcoded = [];
      for (const [field, value] of Object.entries(fields)) {
        if (value !== void 0) {
          const bound = yield applyToken(node, field, value, hints);
          if (!bound && Number(value) !== 0) hardcoded.push(field);
        }
      }
      if (hardcoded.length > 0) {
        const paddingFields = hardcoded.filter((f) => f.startsWith("padding"));
        const others = hardcoded.filter((f) => !f.startsWith("padding"));
        const groups = [];
        if (paddingFields.length > 0) groups.push(paddingFields.length >= 3 ? "padding" : paddingFields.join(", "));
        groups.push(...others);
        const neededScopes = new Set(hardcoded.map((f) => FIELD_TO_SCOPE[f]).filter(Boolean));
        const scopeList = [...neededScopes].join(", ");
        const scopeHint = neededScopes.size > 0 ? ` with scopes: [${scopeList}]` : "";
        hints.push({ type: "suggest", message: `Hardcoded ${groups.join(", ")}. Use an existing FLOAT variable${scopeHint} or create one with variables(method:"create", items:[{name:"<name>", resolvedType:"FLOAT", collectionId:"<collection>", value:<N>, scopes:[${scopeList}]}]), then pass the variable name string instead of a number.` });
      }
    });
  }
  function bindNumericVariable(node, fields, variableName, hints, scopeContext) {
    return __async(this, null, function* () {
      const v = yield findVariableByName(variableName, void 0, scopeContext);
      if (!v) {
        const floatVars = yield figma.variables.getLocalVariablesAsync("FLOAT");
        const names = floatVars.map((v2) => v2.name).slice(0, 20);
        hints.push({ type: "error", message: `Variable '${variableName}' not found. Available FLOAT variables: [${names.join(", ")}]` });
        return false;
      }
      if (v.resolvedType !== "FLOAT") {
        hints.push({ type: "error", message: `Variable '${variableName}' is ${v.resolvedType}, expected FLOAT.` });
        return false;
      }
      const fieldList = Array.isArray(fields) ? fields : [fields];
      for (const f of fieldList) {
        node.setBoundVariable(f, v);
      }
      const label = fieldList.length > 1 ? fieldList[0].replace(/^topLeftRadius$/, "cornerRadius") : fieldList[0];
      hints.push({ type: "confirm", message: `Bound ${label} \u2192 variable '${v.name}'.` });
      return true;
    });
  }
  function findComponentForBinding(node, explicitId, hints) {
    return __async(this, null, function* () {
      if (explicitId) {
        const target = yield figma.getNodeByIdAsync(explicitId);
        if (!target) {
          hints.push({ type: "error", message: `componentId '${explicitId}' not found.` });
          return null;
        }
        if (target.type !== "COMPONENT" && target.type !== "COMPONENT_SET") {
          hints.push({ type: "error", message: `componentId '${explicitId}' is ${target.type}, not a component.` });
          return null;
        }
        return target;
      }
      let cursor = node.parent;
      while (cursor) {
        if (cursor.type === "COMPONENT" || cursor.type === "COMPONENT_SET") {
          return cursor;
        }
        cursor = cursor.parent;
      }
      return null;
    });
  }
  function resolveComponentPropertyKey(defs, name) {
    var _a;
    if (defs[name]) return name;
    return (_a = Object.keys(defs).find((k) => k.startsWith(name + "#"))) != null ? _a : null;
  }
  function bindTextToComponentProperty(textNode, comp, propertyName, hints) {
    var _a;
    let defOwner = comp;
    if (comp.type === "COMPONENT" && ((_a = comp.parent) == null ? void 0 : _a.type) === "COMPONENT_SET") {
      defOwner = comp.parent;
    }
    const defs = defOwner.componentPropertyDefinitions;
    const key = resolveComponentPropertyKey(defs, propertyName);
    if (!key) {
      const available = Object.keys(defs).filter((k) => defs[k].type === "TEXT").map((k) => k.split("#")[0]);
      hints.push({ type: "error", message: `componentPropertyName '${propertyName}' not found. Available TEXT properties: [${available.join(", ")}]` });
      return false;
    }
    if (defs[key].type !== "TEXT") {
      hints.push({ type: "error", message: `componentPropertyName '${propertyName}' is ${defs[key].type}, not TEXT.` });
      return false;
    }
    textNode.componentPropertyReferences = { characters: key };
    return true;
  }
  function suggestTextStyle(fontSize, fontWeight) {
    return __async(this, null, function* () {
      const styles = yield figma.getLocalTextStylesAsync();
      const matching = styles.filter((s) => s.fontSize === fontSize);
      if (matching.length > 0) {
        const names = matching.map((s) => s.name).slice(0, 5);
        return { type: "suggest", message: `Manual font (${fontSize}px / ${fontWeight}w) \u2014 text styles at same size: [${names.join(", ")}]. Use textStyleName to link to a design token.` };
      }
      return { type: "suggest", message: `Manual font (${fontSize}px / ${fontWeight}w) has no text style. Create one with styles(method: "create", type: "text"), then use textStyleName for design token consistency.` };
    });
  }

  // ../core/dist/tools/generated/guards.js
  var componentsCreateComponent = /* @__PURE__ */ new Set([
    "annotations",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "children",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "description",
    "effectStyleName",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "overflowDirection",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "parentId",
    "primaryAxisAlignItems",
    "properties",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "topLeftRadius",
    "topRightRadius",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var componentsCreateFromNode = /* @__PURE__ */ new Set(["exposeText", "name", "nodeId"]);
  var componentsCreateVariantSet = /* @__PURE__ */ new Set([
    "annotations",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "children",
    "componentIds",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "effectStyleName",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "overflowDirection",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "parentId",
    "primaryAxisAlignItems",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "topLeftRadius",
    "topRightRadius",
    "variantPropertyName",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var componentsUpdate = /* @__PURE__ */ new Set([
    "action",
    "defaultValue",
    "id",
    "name",
    "preferredValues",
    "propertyName",
    "type"
  ]);
  var nodeUpdate = /* @__PURE__ */ new Set([
    "annotations",
    "bindings",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "clearFill",
    "constraints",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "effectStyleName",
    "effects",
    "explicitMode",
    "exportSettings",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "fontColor",
    "fontColorStyleName",
    "fontColorVariableName",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "height",
    "id",
    "imageScaleMode",
    "imageUrl",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "letterSpacing",
    "lineHeight",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "overflowDirection",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "primaryAxisAlignItems",
    "properties",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "textAlignHorizontal",
    "textAlignVertical",
    "textAutoResize",
    "textCase",
    "textDecoration",
    "textStyleId",
    "textStyleName",
    "topLeftRadius",
    "topRightRadius",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var framesCreateFrame = /* @__PURE__ */ new Set([
    "annotations",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "children",
    "clipsContent",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "effectStyleName",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "overflowDirection",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "parentId",
    "primaryAxisAlignItems",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "topLeftRadius",
    "topRightRadius",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var framesCreateAutoLayout = /* @__PURE__ */ new Set([
    "annotations",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "children",
    "clipsContent",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "effectStyleName",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "nodeIds",
    "opacity",
    "overflowDirection",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "parentId",
    "primaryAxisAlignItems",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "topLeftRadius",
    "topRightRadius",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var framesCreateSection = /* @__PURE__ */ new Set([
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "name",
    "parentId",
    "width",
    "x",
    "y"
  ]);
  var framesCreateRectangle = /* @__PURE__ */ new Set([
    "annotations",
    "bottomLeftRadius",
    "bottomRightRadius",
    "cornerRadius",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "name",
    "opacity",
    "parentId",
    "strokeColor",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "topLeftRadius",
    "topRightRadius",
    "width",
    "x",
    "y"
  ]);
  var framesCreateEllipse = /* @__PURE__ */ new Set([
    "annotations",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "name",
    "opacity",
    "parentId",
    "strokeColor",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "width",
    "x",
    "y"
  ]);
  var framesCreateLine = /* @__PURE__ */ new Set([
    "annotations",
    "layoutSizingHorizontal",
    "length",
    "name",
    "opacity",
    "parentId",
    "rotation",
    "strokeColor",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "x",
    "y"
  ]);
  var framesCreateGroup = /* @__PURE__ */ new Set(["name", "nodeIds", "parentId"]);
  var framesCreateBooleanOperation = /* @__PURE__ */ new Set(["name", "nodeIds", "operation", "parentId"]);
  var framesCreateSvg = /* @__PURE__ */ new Set([
    "fillStyleName",
    "fillVariableName",
    "name",
    "parentId",
    "strokeStyleName",
    "strokeVariableName",
    "svg",
    "x",
    "y"
  ]);
  var framesCreateSlot = /* @__PURE__ */ new Set([
    "annotations",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "componentId",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "effectStyleName",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "height",
    "imageScaleMode",
    "imageUrl",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "overflowDirection",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "parentId",
    "primaryAxisAlignItems",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "topLeftRadius",
    "topRightRadius",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var instancesCreate = /* @__PURE__ */ new Set([
    "blendMode",
    "componentId",
    "componentKey",
    "componentName",
    "effectStyleName",
    "explicitMode",
    "height",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "parentId",
    "properties",
    "sizing",
    "variantProperties",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var instancesUpdate = /* @__PURE__ */ new Set([
    "bindings",
    "blendMode",
    "bottomLeftRadius",
    "bottomRightRadius",
    "clearFill",
    "componentProperties",
    "constraints",
    "cornerRadius",
    "counterAxisAlignItems",
    "counterAxisSpacing",
    "effectStyleName",
    "effects",
    "explicitMode",
    "exportSettings",
    "fillColor",
    "fillStyleName",
    "fillVariableName",
    "fills",
    "fontColor",
    "fontColorStyleName",
    "fontColorVariableName",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "height",
    "id",
    "itemSpacing",
    "layoutMode",
    "layoutPositioning",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "layoutWrap",
    "letterSpacing",
    "lineHeight",
    "locked",
    "maxHeight",
    "maxWidth",
    "minHeight",
    "minWidth",
    "name",
    "opacity",
    "padding",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "primaryAxisAlignItems",
    "properties",
    "rotation",
    "strokeAlign",
    "strokeBottomWeight",
    "strokeColor",
    "strokeLeftWeight",
    "strokeRightWeight",
    "strokeStyleName",
    "strokeTopWeight",
    "strokeVariableName",
    "strokeWeight",
    "strokes",
    "strokesIncludedInLayout",
    "textAlignHorizontal",
    "textAlignVertical",
    "textAutoResize",
    "textCase",
    "textDecoration",
    "textStyleId",
    "textStyleName",
    "topLeftRadius",
    "topRightRadius",
    "visible",
    "width",
    "x",
    "y"
  ]);
  var instancesSwap = /* @__PURE__ */ new Set(["componentId", "id"]);
  var instancesDetach = /* @__PURE__ */ new Set(["id"]);
  var instancesResetOverrides = /* @__PURE__ */ new Set(["id"]);
  var stylesCreatePaint = /* @__PURE__ */ new Set(["color", "colorVariableName", "description", "name"]);
  var stylesCreateText = /* @__PURE__ */ new Set([
    "description",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "leadingTrim",
    "letterSpacing",
    "lineHeight",
    "name",
    "paragraphIndent",
    "paragraphSpacing",
    "textCase",
    "textDecoration"
  ]);
  var stylesCreateEffect = /* @__PURE__ */ new Set(["description", "effects", "name"]);
  var stylesCreateGrid = /* @__PURE__ */ new Set(["description", "layoutGrids", "name"]);
  var stylesUpdate = /* @__PURE__ */ new Set([
    "color",
    "colorVariableName",
    "description",
    "effects",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "id",
    "layoutGrids",
    "leadingTrim",
    "letterSpacing",
    "lineHeight",
    "name",
    "paragraphIndent",
    "paragraphSpacing",
    "textCase",
    "textDecoration"
  ]);
  var stylesDelete = /* @__PURE__ */ new Set(["id"]);
  var textCreate = /* @__PURE__ */ new Set([
    "annotations",
    "componentId",
    "componentPropertyName",
    "fills",
    "fontColor",
    "fontColorStyleName",
    "fontColorVariableName",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "letterSpacing",
    "lineHeight",
    "name",
    "parentId",
    "text",
    "textAlignHorizontal",
    "textAlignVertical",
    "textAutoResize",
    "textCase",
    "textDecoration",
    "textStyleId",
    "textStyleName",
    "width",
    "x",
    "y"
  ]);
  var variableCollectionsCreate = /* @__PURE__ */ new Set(["modes", "name", "variables"]);
  var variableCollectionsUpdate = /* @__PURE__ */ new Set(["id", "name"]);
  var variableCollectionsDelete = /* @__PURE__ */ new Set(["id"]);
  var variableCollectionsAddMode = /* @__PURE__ */ new Set(["collectionId", "name"]);
  var variableCollectionsRenameMode = /* @__PURE__ */ new Set(["collectionId", "modeId", "name"]);
  var variableCollectionsRemoveMode = /* @__PURE__ */ new Set(["collectionId", "modeId"]);
  var variablesCreate = /* @__PURE__ */ new Set(["description", "name", "scopes", "type", "value", "valuesByMode"]);
  var variablesUpdate = /* @__PURE__ */ new Set(["description", "name", "rename", "scopes", "value", "valuesByMode"]);
  var variablesDelete = /* @__PURE__ */ new Set(["name"]);
  var mixinTextParams = /* @__PURE__ */ new Set([
    "fontColor",
    "fontColorStyleName",
    "fontColorVariableName",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "textAlignHorizontal",
    "textAlignVertical",
    "textAutoResize",
    "textCase",
    "textDecoration",
    "textStyleId",
    "textStyleName"
  ]);

  // src/handlers/annotations.ts
  var ALL_ANNOTATION_PROPS = /* @__PURE__ */ new Set([
    "width",
    "height",
    "maxWidth",
    "minWidth",
    "maxHeight",
    "minHeight",
    "fills",
    "strokes",
    "effects",
    "strokeWeight",
    "cornerRadius",
    "textStyleId",
    "textAlignHorizontal",
    "fontFamily",
    "fontStyle",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "itemSpacing",
    "padding",
    "layoutMode",
    "alignItems",
    "opacity",
    "mainComponent",
    "gridRowGap",
    "gridColumnGap",
    "gridRowCount",
    "gridColumnCount",
    "gridRowAnchorIndex",
    "gridColumnAnchorIndex",
    "gridRowSpan",
    "gridColumnSpan"
  ]);
  var PROP_TO_NODE_FIELD = {
    width: "width",
    height: "height",
    maxWidth: "maxWidth",
    minWidth: "minWidth",
    maxHeight: "maxHeight",
    minHeight: "minHeight",
    fills: "fills",
    strokes: "strokes",
    effects: "effects",
    strokeWeight: "strokeWeight",
    cornerRadius: "cornerRadius",
    opacity: "opacity",
    // Text — all map to fontName/fontSize/etc on TextNode
    fontFamily: "fontName",
    fontStyle: "fontName",
    fontSize: "fontSize",
    fontWeight: "fontName",
    lineHeight: "lineHeight",
    letterSpacing: "letterSpacing",
    textAlignHorizontal: "textAlignHorizontal",
    textStyleId: "textStyleId",
    // Layout — AutoLayoutMixin fields
    itemSpacing: "itemSpacing",
    padding: "paddingLeft",
    layoutMode: "layoutMode",
    alignItems: "primaryAxisAlignItems",
    // Instance
    mainComponent: "mainComponent",
    // Grid — GridLayoutMixin
    gridRowGap: "gridColumnSizes",
    gridColumnGap: "gridColumnSizes",
    gridRowCount: "gridColumnSizes",
    gridColumnCount: "gridColumnSizes",
    gridRowAnchorIndex: "gridColumnSizes",
    gridColumnAnchorIndex: "gridColumnSizes",
    gridRowSpan: "gridColumnSizes",
    gridColumnSpan: "gridColumnSizes"
  };
  var PROP_GROUP = {
    fontFamily: "text",
    fontStyle: "text",
    fontSize: "text",
    fontWeight: "text",
    lineHeight: "text",
    letterSpacing: "text",
    textAlignHorizontal: "text",
    textStyleId: "text",
    itemSpacing: "auto-layout",
    padding: "auto-layout",
    layoutMode: "auto-layout",
    alignItems: "auto-layout",
    mainComponent: "instance",
    gridRowGap: "grid",
    gridColumnGap: "grid",
    gridRowCount: "grid",
    gridColumnCount: "grid",
    gridRowAnchorIndex: "grid",
    gridColumnAnchorIndex: "grid",
    gridRowSpan: "grid",
    gridColumnSpan: "grid"
  };
  var LAYOUT_PROPS = /* @__PURE__ */ new Set(["itemSpacing", "padding", "layoutMode", "alignItems"]);
  var GRID_PROPS = /* @__PURE__ */ new Set(["gridRowGap", "gridColumnGap", "gridRowCount", "gridColumnCount", "gridRowAnchorIndex", "gridColumnAnchorIndex", "gridRowSpan", "gridColumnSpan"]);
  function availablePropertiesForNode(node) {
    var _a;
    const n = node;
    const available = [];
    for (const prop of ALL_ANNOTATION_PROPS) {
      if (LAYOUT_PROPS.has(prop) && (!("layoutMode" in n) || n.layoutMode === "NONE")) continue;
      if (GRID_PROPS.has(prop) && (!("gridColumnSizes" in n) || !((_a = n.gridColumnSizes) == null ? void 0 : _a.length))) continue;
      if (prop === "mainComponent" && node.type !== "INSTANCE") continue;
      const field = PROP_TO_NODE_FIELD[prop];
      if (field && !(field in n)) continue;
      available.push(prop);
    }
    return available;
  }
  function validateProperties(node, properties) {
    var _a;
    const n = node;
    const available = availablePropertiesForNode(node);
    for (const prop of properties) {
      let reason;
      if (!ALL_ANNOTATION_PROPS.has(prop)) {
        reason = `Unknown annotation property "${prop}".`;
      } else if (LAYOUT_PROPS.has(prop) && (!("layoutMode" in n) || n.layoutMode === "NONE")) {
        reason = `"${prop}" requires auto-layout \u2014 this ${node.type} has layoutMode NONE.`;
      } else if (GRID_PROPS.has(prop) && (!("gridColumnSizes" in n) || !((_a = n.gridColumnSizes) == null ? void 0 : _a.length))) {
        reason = `"${prop}" requires grid layout \u2014 not active on this ${node.type}.`;
      } else if (prop === "mainComponent" && node.type !== "INSTANCE") {
        reason = `"mainComponent" is only valid on INSTANCE nodes, not ${node.type}.`;
      } else {
        const field = PROP_TO_NODE_FIELD[prop];
        if (field && !(field in n)) {
          const group = PROP_GROUP[prop];
          reason = group ? `"${prop}" is a ${group} property \u2014 not available on ${node.type} nodes.` : `"${prop}" is not available on ${node.type} nodes.`;
        }
      }
      if (reason) {
        throw new Error(`${reason} Available for this ${node.type}: ${available.join(", ")}`);
      }
    }
  }
  function resolveCategory(categoryId) {
    return __async(this, null, function* () {
      if (!categoryId) return void 0;
      const cat = yield figma.annotations.getAnnotationCategoryByIdAsync(categoryId);
      if (!cat) return void 0;
      return { id: cat.id, label: cat.label, color: cat.color };
    });
  }
  function cloneAnnotation(a) {
    const out = {};
    if (a.labelMarkdown) out.labelMarkdown = a.labelMarkdown;
    else if (a.label) out.label = a.label;
    if (a.properties && a.properties.length > 0) {
      out.properties = Array.from(a.properties).map((p) => ({ type: p.type }));
    }
    if (a.categoryId) out.categoryId = a.categoryId;
    return out;
  }
  function buildAnnotation(p, node) {
    const ann = {};
    if (p.labelMarkdown) ann.labelMarkdown = p.labelMarkdown;
    else if (p.label) ann.label = p.label;
    if (p.properties && Array.isArray(p.properties) && p.properties.length > 0) {
      if (node) validateProperties(node, p.properties);
      ann.properties = p.properties.map((t) => ({ type: t }));
    }
    if (p.categoryId) ann.categoryId = p.categoryId;
    return ann;
  }
  function applyAnnotations(node, p, hints) {
    if (!p.annotations || !Array.isArray(p.annotations) || p.annotations.length === 0) return;
    if (!("annotations" in node)) return;
    const built = [];
    for (let i = 0; i < p.annotations.length; i++) {
      const a = p.annotations[i];
      const ann = {};
      if (a.labelMarkdown) ann.labelMarkdown = a.labelMarkdown;
      else if (a.label) ann.label = a.label;
      if (!ann.label && !ann.labelMarkdown) {
        hints.push({ type: "warn", message: `annotations[${i}]: missing label or labelMarkdown \u2014 skipped.` });
        continue;
      }
      if (a.properties && Array.isArray(a.properties) && a.properties.length > 0) {
        const available = availablePropertiesForNode(node);
        const validProps = [];
        for (const prop of a.properties) {
          if (!available.includes(prop)) {
            hints.push({ type: "warn", message: `annotations[${i}]: "${prop}" not valid for ${node.type} \u2014 stripped. Fix: annotations(method:"set", id:"${node.id}", annotations:[{...properties:["${available.slice(0, 5).join('","')}"]}])` });
          } else {
            validProps.push(prop);
          }
        }
        if (validProps.length > 0) ann.properties = validProps.map((t) => ({ type: t }));
      }
      if (a.categoryId) ann.categoryId = a.categoryId;
      built.push(ann);
    }
    if (built.length > 0) {
      try {
        node.annotations = built;
      } catch (e) {
        hints.push({ type: "warn", message: `annotations: failed to apply \u2014 ${e.message}. Fix: annotations(method:"set", id:"${node.id}", annotations:[...])` });
      }
    }
  }
  function resolveNode(id) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(id);
      if (!node) throw new Error(`Node "${id}" not found.`);
      if (!("annotations" in node)) throw new Error(`Node "${id}" (${node.type}) does not support annotations.`);
      return node;
    });
  }
  function serializeAnnotation(a, index) {
    const entry = { index };
    if (a.label) entry.label = a.label;
    if (a.labelMarkdown) entry.labelMarkdown = a.labelMarkdown;
    if (a.properties && a.properties.length > 0) {
      entry.properties = a.properties.map((ap) => ap.type);
    }
    if (a.categoryId) entry.categoryId = a.categoryId;
    return entry;
  }
  function getSingle(p) {
    return __async(this, null, function* () {
      const node = yield resolveNode(p.id);
      const anns = node.annotations;
      const filterCat = p.categoryId;
      const results = [];
      for (let i = 0; i < anns.length; i++) {
        const a = anns[i];
        if (filterCat && a.categoryId !== filterCat) continue;
        const entry = serializeAnnotation(a, i);
        const cat = yield resolveCategory(a.categoryId);
        if (cat) entry.category = cat;
        results.push(entry);
      }
      return { id: node.id, name: node.name, annotations: results };
    });
  }
  function getAnnotations(params) {
    return __async(this, null, function* () {
      return batchHandler(params, getSingle);
    });
  }
  function setSingle(p) {
    return __async(this, null, function* () {
      const node = yield resolveNode(p.id);
      if (!p.annotations) throw new Error("set requires annotations array.");
      const annotations = (p.annotations || []).map((a) => buildAnnotation(a, node));
      node.annotations = annotations;
      return { id: node.id, count: annotations.length };
    });
  }
  function setAnnotations(params) {
    return __async(this, null, function* () {
      return batchHandler(params, setSingle);
    });
  }
  function addSingle(p) {
    return __async(this, null, function* () {
      const node = yield resolveNode(p.id);
      if (!p.label && !p.labelMarkdown) throw new Error("add requires label or labelMarkdown.");
      const existing = Array.from(node.annotations).map(cloneAnnotation);
      existing.push(buildAnnotation(p, node));
      node.annotations = existing;
      return { id: node.id, index: existing.length - 1, count: existing.length };
    });
  }
  function addAnnotation(params) {
    return __async(this, null, function* () {
      return batchHandler(params, addSingle);
    });
  }
  function removeSingle(p) {
    return __async(this, null, function* () {
      const node = yield resolveNode(p.id);
      const existing = Array.from(node.annotations).map(cloneAnnotation);
      const idx = Number(p.index);
      if (idx < 0 || idx >= existing.length) {
        throw new Error(`Annotation index ${idx} out of range (node has ${existing.length} annotations).`);
      }
      existing.splice(idx, 1);
      node.annotations = existing;
      return { id: node.id, removed: true, count: existing.length };
    });
  }
  function removeAnnotation(params) {
    return __async(this, null, function* () {
      return batchHandler(params, removeSingle);
    });
  }
  var DEFAULT_LIST_LIMIT = 100;
  function listAnnotations(params) {
    return __async(this, null, function* () {
      const parentId = params.parentId;
      const root = parentId ? yield figma.getNodeByIdAsync(parentId) : figma.currentPage;
      if (!root) throw new Error(`Node "${parentId}" not found.`);
      const filterCat = params.categoryId;
      const limit = Number(params.limit) || DEFAULT_LIST_LIMIT;
      const results = [];
      function walk(node) {
        return __async(this, null, function* () {
          if (results.length >= limit) return true;
          if ("annotations" in node) {
            const anns = node.annotations;
            for (let i = 0; i < anns.length; i++) {
              if (results.length >= limit) return true;
              const a = anns[i];
              if (filterCat && a.categoryId !== filterCat) continue;
              const entry = serializeAnnotation(a, i);
              entry.nodeId = node.id;
              entry.nodeName = node.name;
              entry.nodeType = node.type;
              const cat = yield resolveCategory(a.categoryId);
              if (cat) entry.category = cat;
              results.push(entry);
            }
          }
          if ("children" in node) {
            for (const child of node.children) {
              if (yield walk(child)) return true;
            }
          }
          return false;
        });
      }
      yield walk(root);
      return __spreadValues({ results, count: results.length }, results.length >= limit ? { _truncated: true } : {});
    });
  }
  function listCategories() {
    return __async(this, null, function* () {
      const cats = yield figma.annotations.getAnnotationCategoriesAsync();
      return {
        categories: cats.map((c) => ({
          id: c.id,
          label: c.label,
          color: c.color,
          isPreset: c.isPreset
        }))
      };
    });
  }
  function createCategory(params) {
    return __async(this, null, function* () {
      if (!params.label) throw new Error("create_category requires label.");
      if (!params.color) throw new Error("create_category requires color.");
      const cat = yield figma.annotations.addAnnotationCategoryAsync({
        label: params.label,
        color: params.color
      });
      return { id: cat.id, label: cat.label, color: cat.color };
    });
  }
  function updateCategory(params) {
    return __async(this, null, function* () {
      if (!params.id) throw new Error("update_category requires id.");
      const cat = yield figma.annotations.getAnnotationCategoryByIdAsync(params.id);
      if (!cat) throw new Error(`Annotation category "${params.id}" not found.`);
      if (params.label) cat.setLabel(params.label);
      if (params.color) cat.setColor(params.color);
      return { id: cat.id, label: cat.label, color: cat.color };
    });
  }
  function deleteCategory(params) {
    return __async(this, null, function* () {
      if (!params.id) throw new Error("delete_category requires id.");
      const cat = yield figma.annotations.getAnnotationCategoryByIdAsync(params.id);
      if (!cat) throw new Error(`Annotation category "${params.id}" not found.`);
      cat.remove();
      return { deleted: true };
    });
  }
  var figmaHandlers5 = {
    "annotations.get": getAnnotations,
    "annotations.list": listAnnotations,
    "annotations.set": setAnnotations,
    "annotations.add": addAnnotation,
    "annotations.remove": removeAnnotation,
    "annotations.categories": listCategories,
    "annotations.create_category": createCategory,
    "annotations.update_category": updateCategory,
    "annotations.delete_category": deleteCategory
  };

  // src/handlers/create-shape.ts
  var SVG_KEYS = /* @__PURE__ */ new Set([...framesCreateSvg, "fillVariableId", "strokeVariableId"]);
  var LINE_KEYS = /* @__PURE__ */ new Set([...framesCreateLine, "strokeVariableId", "strokeStyleName"]);
  function createSingleSection(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const section = figma.createSection();
      try {
        section.x = (_a = p.x) != null ? _a : 0;
        section.y = (_b = p.y) != null ? _b : 0;
        section.resizeWithoutConstraints((_c = p.width) != null ? _c : 500, (_d = p.height) != null ? _d : 500);
        section.name = p.name || "Section";
        section.fills = [];
        const hints = [];
        const hasImageFill = yield applyImageFill(section, p, hints);
        if (!hasImageFill) yield applyFillWithAutoBind(section, p, hints);
        yield appendToParent(section, p.parentId);
        applyAnnotations(section, p, hints);
        const result = { id: section.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        section.remove();
        throw e;
      }
    });
  }
  function createSingleSvg(p) {
    return __async(this, null, function* () {
      var _a, _b;
      const node = figma.createNodeFromSvg(p.svg);
      try {
        node.x = (_a = p.x) != null ? _a : 0;
        node.y = (_b = p.y) != null ? _b : 0;
        if (p.name) node.name = p.name;
        yield appendToParent(node, p.parentId);
        if (p.fillStyleName || p.fillVariableId || p.fillVariableName) {
          const vectors = [];
          const collect = (n) => {
            if (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION" || n.type === "STAR" || n.type === "LINE" || n.type === "ELLIPSE" || n.type === "POLYGON") vectors.push(n);
            if ("children" in n) n.children.forEach(collect);
          };
          collect(node);
          let variable = null;
          if (p.fillVariableId) {
            variable = yield findVariableById(p.fillVariableId);
          } else if (p.fillVariableName) {
            variable = yield findColorVariableByName(p.fillVariableName);
          }
          if (variable) {
            for (const vec of vectors) {
              if ("fills" in vec && vec.fills.length > 0) {
                const paints = vec.fills.slice();
                paints[0] = figma.variables.setBoundVariableForPaint(paints[0], "color", variable);
                vec.fills = paints;
              }
            }
          } else if (p.fillStyleName) {
            const styles = yield figma.getLocalPaintStylesAsync();
            const exact = styles.find((s) => s.name === p.fillStyleName);
            const match = exact || styles.find((s) => s.name.toLowerCase().includes(p.fillStyleName.toLowerCase()));
            if (match) {
              for (const vec of vectors) {
                try {
                  yield vec.setFillStyleIdAsync(match.id);
                } catch (e) {
                }
              }
            }
          }
        }
        if (p.strokeStyleName || p.strokeVariableId || p.strokeVariableName) {
          const vectors = [];
          const collect = (n) => {
            if (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION" || n.type === "STAR" || n.type === "LINE" || n.type === "ELLIPSE" || n.type === "POLYGON") vectors.push(n);
            if ("children" in n) n.children.forEach(collect);
          };
          collect(node);
          let variable = null;
          if (p.strokeVariableId) {
            variable = yield findVariableById(p.strokeVariableId);
          } else if (p.strokeVariableName) {
            variable = yield findColorVariableByName(p.strokeVariableName);
          }
          if (variable) {
            for (const vec of vectors) {
              if ("strokes" in vec && vec.strokes.length > 0) {
                const paints = vec.strokes.slice();
                paints[0] = figma.variables.setBoundVariableForPaint(paints[0], "color", variable);
                vec.strokes = paints;
              }
            }
          } else if (p.strokeStyleName) {
            const styles = yield figma.getLocalPaintStylesAsync();
            const exact = styles.find((s) => s.name === p.strokeStyleName);
            const match = exact || styles.find((s) => s.name.toLowerCase().includes(p.strokeStyleName.toLowerCase()));
            if (match) {
              for (const vec of vectors) {
                try {
                  yield vec.setStrokeStyleIdAsync(match.id);
                } catch (e) {
                }
              }
            }
          }
        }
        return { id: node.id };
      } catch (e) {
        node.remove();
        throw e;
      }
    });
  }
  function createSingleRectangle(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const rect = figma.createRectangle();
      try {
        rect.x = (_a = p.x) != null ? _a : 0;
        rect.y = (_b = p.y) != null ? _b : 0;
        rect.resize((_c = p.width) != null ? _c : 100, (_d = p.height) != null ? _d : 100);
        rect.name = p.name || "Rectangle";
        const hints = [];
        yield applyTokens(rect, { opacity: p.opacity }, hints);
        yield applyCornerRadius(rect, p, hints);
        const hasImageFill = yield applyImageFill(rect, p, hints);
        if (!hasImageFill) yield applyFillWithAutoBind(rect, p, hints);
        yield applyStrokeWithAutoBind(rect, p, hints);
        const parent = yield appendAndApplySizing(rect, p, hints);
        checkOverlappingSiblings(rect, parent, hints);
        applyAnnotations(rect, p, hints);
        const result = { id: rect.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        rect.remove();
        throw e;
      }
    });
  }
  function createSingleEllipse(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      const ellipse = figma.createEllipse();
      try {
        ellipse.x = (_a = p.x) != null ? _a : 0;
        ellipse.y = (_b = p.y) != null ? _b : 0;
        ellipse.resize((_c = p.width) != null ? _c : 100, (_e = (_d = p.height) != null ? _d : p.width) != null ? _e : 100);
        ellipse.name = p.name || "Ellipse";
        const hints = [];
        yield applyTokens(ellipse, { opacity: p.opacity }, hints);
        const hasImageFill = yield applyImageFill(ellipse, p, hints);
        if (!hasImageFill) yield applyFillWithAutoBind(ellipse, p, hints);
        yield applyStrokeWithAutoBind(ellipse, p, hints);
        const parent = yield appendAndApplySizing(ellipse, p, hints);
        checkOverlappingSiblings(ellipse, parent, hints);
        applyAnnotations(ellipse, p, hints);
        const result = { id: ellipse.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        ellipse.remove();
        throw e;
      }
    });
  }
  function createSingleLine(p) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const line = figma.createLine();
      try {
        line.x = (_a = p.x) != null ? _a : 0;
        line.y = (_b = p.y) != null ? _b : 0;
        line.resize((_c = p.length) != null ? _c : 100, 0);
        line.name = p.name || "Line";
        if (p.rotation !== void 0) line.rotation = p.rotation;
        const hints = [];
        yield applyTokens(line, { opacity: p.opacity }, hints);
        if (!p.strokes && !p.strokeColor && !p.strokeVariableId && !p.strokeVariableName && !p.strokeStyleName) {
          line.strokes = [solidPaint({ r: 0, g: 0, b: 0 })];
        }
        yield applyStrokeWithAutoBind(line, p, hints);
        const parent = yield appendAndApplySizing(line, p, hints);
        checkOverlappingSiblings(line, parent, hints);
        if (!p.layoutSizingHorizontal && parent && "layoutMode" in parent && parent.layoutMode === "VERTICAL") {
          line.layoutSizingHorizontal = "FILL";
        }
        applyAnnotations(line, p, hints);
        const result = { id: line.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        line.remove();
        throw e;
      }
    });
  }
  function createSingleGroup(p) {
    return __async(this, null, function* () {
      var _a;
      if (!((_a = p.nodeIds) == null ? void 0 : _a.length)) throw new Error("nodeIds required (at least 1 node)");
      const nodes = [];
      for (const id of p.nodeIds) {
        const node = yield figma.getNodeByIdAsync(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        nodes.push(node);
      }
      const parent = p.parentId ? yield figma.getNodeByIdAsync(p.parentId) : nodes[0].parent;
      if (!parent || !("children" in parent)) throw new Error("Invalid parent for group");
      const group = figma.group(nodes, parent);
      if (p.name) group.name = p.name;
      return { id: group.id };
    });
  }
  function createSingleBooleanOperation(p) {
    return __async(this, null, function* () {
      var _a;
      if (!((_a = p.nodeIds) == null ? void 0 : _a.length) || p.nodeIds.length < 2) throw new Error("nodeIds required (at least 2 nodes)");
      const nodes = [];
      for (const id of p.nodeIds) {
        const node = yield figma.getNodeByIdAsync(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        nodes.push(node);
      }
      const parent = p.parentId ? yield figma.getNodeByIdAsync(p.parentId) : nodes[0].parent;
      if (!parent || !("children" in parent)) throw new Error("Invalid parent for boolean operation");
      const ops = {
        UNION: figma.union,
        SUBTRACT: figma.subtract,
        INTERSECT: figma.intersect,
        EXCLUDE: figma.exclude
      };
      const op = ops[p.operation];
      if (!op) throw new Error(`Unknown boolean operation: ${p.operation}. Expected: UNION, SUBTRACT, INTERSECT, EXCLUDE`);
      const result = op(nodes, parent);
      if (p.name) result.name = p.name;
      return { id: result.id };
    });
  }
  var figmaHandlers6 = {
    create_section: (p) => batchHandler(p, createSingleSection, { keys: framesCreateSection, help: 'frames(method: "help", topic: "create")' }),
    create_node_from_svg: (p) => batchHandler(p, createSingleSvg, { keys: SVG_KEYS, help: 'frames(method: "help", topic: "create")' }),
    create_rectangle: (p) => batchHandler(p, createSingleRectangle, { keys: framesCreateRectangle, help: 'frames(method: "help", topic: "create")' }),
    create_ellipse: (p) => batchHandler(p, createSingleEllipse, { keys: framesCreateEllipse, help: 'frames(method: "help", topic: "create")' }),
    create_line: (p) => batchHandler(p, createSingleLine, { keys: LINE_KEYS, help: 'frames(method: "help", topic: "create")' }),
    create_group: (p) => batchHandler(p, createSingleGroup, { keys: framesCreateGroup, help: 'frames(method: "help", topic: "create")' }),
    create_boolean_operation: (p) => batchHandler(p, createSingleBooleanOperation, { keys: framesCreateBooleanOperation, help: 'frames(method: "help", topic: "create")' })
  };

  // ../core/dist/utils/wcag.js
  function srgbRelativeLuminance(r, g, b) {
    const linearize = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  }
  function contrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function alphaComposite(fgR, fgG, fgB, fgA, bgR, bgG, bgB) {
    return {
      r: fgR * fgA + bgR * (1 - fgA),
      g: fgG * fgA + bgG * (1 - fgA),
      b: fgB * fgA + bgB * (1 - fgA)
    };
  }
  function checkContrastPair(fg, bg, large = false) {
    const fgLum = srgbRelativeLuminance(fg.r, fg.g, fg.b);
    const bgLum = srgbRelativeLuminance(bg.r, bg.g, bg.b);
    const ratio = contrastRatio(fgLum, bgLum);
    const aaRequired = large ? 3 : 4.5;
    const aaaRequired = large ? 4.5 : 7;
    return {
      ratio: Math.round(ratio * 100) / 100,
      passesAA: ratio >= aaRequired,
      passesAAA: ratio >= aaaRequired,
      aaRequired,
      aaaRequired
    };
  }
  function isLargeText(fontSize, fontWeight) {
    if (fontSize >= 24) return true;
    if (fontSize >= 18.66 && fontWeight >= 700) return true;
    return false;
  }
  function inferFontWeight(fontStyle) {
    const s = fontStyle.toLowerCase();
    if (s.includes("thin") || s.includes("hairline")) return 100;
    if (s.includes("extralight") || s.includes("extra light") || s.includes("ultralight")) return 200;
    if (s.includes("light")) return 300;
    if (s.includes("regular") || s.includes("normal") || s === "roman") return 400;
    if (s.includes("medium")) return 500;
    if (s.includes("semibold") || s.includes("semi bold") || s.includes("demibold")) return 600;
    if (s.includes("extrabold") || s.includes("extra bold") || s.includes("ultrabold")) return 800;
    if (s.includes("bold")) return 700;
    if (s.includes("black") || s.includes("heavy")) return 900;
    return 400;
  }
  var INTERACTIVE_NAME_PATTERN = /\b(button|btn|link|tab|toggle|switch|checkbox|radio|chip|badge|tag|cta|menu[-_]?item|nav[-_]?item|input|select|dropdown|close|action|icon[-_]?button)\b/i;
  function looksInteractive(node) {
    if (node.type === "COMPONENT" || node.type === "INSTANCE") return true;
    if (node.type === "FRAME" && INTERACTIVE_NAME_PATTERN.test(node.name)) return true;
    return false;
  }

  // src/handlers/lint.ts
  init_color();
  var WCAG_RULES = [
    "wcag-contrast",
    "wcag-contrast-enhanced",
    "wcag-non-text-contrast",
    "wcag-target-size",
    "wcag-text-size",
    "wcag-line-height"
  ];
  var CATEGORY_RULES = {
    component: ["no-text-property", "component-bindings"],
    composition: ["no-autolayout", "overlapping-children", "shape-instead-of-frame", "fixed-in-autolayout", "overflow-parent", "unbounded-hug", "hug-cross-axis", "empty-container"],
    token: ["hardcoded-color", "hardcoded-token", "no-text-style"],
    naming: ["default-name", "stale-text-name"]
  };
  var RULE_META = {
    "no-autolayout": { severity: "heuristic", category: "composition", fix: "Convert to auto-layout. Use lint.fix or set layoutMode." },
    "shape-instead-of-frame": { severity: "style", category: "composition", fix: "Replace shape with a frame \u2014 shapes can't have children." },
    "hardcoded-color": { severity: "heuristic", category: "token", fix: 'Bind to a color variable or paint style. guidelines(topic:"token-discipline") for details.' },
    "hardcoded-token": { severity: "heuristic", category: "token", fix: 'Bind to a FLOAT variable. guidelines(topic:"token-discipline") for details.' },
    "no-text-style": { severity: "heuristic", category: "token", fix: 'Apply a text style via textStyleName. guidelines(topic:"token-discipline") for details.' },
    "fixed-in-autolayout": { severity: "heuristic", category: "composition", fix: "Use FILL or HUG instead of FIXED inside auto-layout." },
    "overflow-parent": { severity: "unsafe", category: "composition", fix: "Child exceeds parent's available inner space. Fix: use layoutSizingHorizontal/Vertical:'FILL' on children, reduce the fixed dimension, or set overflowDirection on the parent for scrollable overflow." },
    "default-name": { severity: "style", category: "naming", fix: "Rename to something descriptive." },
    "empty-container": { severity: "style", category: "composition", fix: "Delete if leftover, or add content." },
    "stale-text-name": { severity: "style", category: "naming", fix: "Sync layer name with text content, or leave if intentional." },
    "no-text-property": { severity: "heuristic", category: "component", fix: 'Expose as a TEXT component property. guidelines(topic:"component-structure") for details.' },
    "component-bindings": { severity: "heuristic", category: "component", fix: 'Bind text nodes to properties or delete orphaned ones. guidelines(topic:"component-structure") for details.' },
    "overlapping-children": { severity: "heuristic", category: "composition", fix: "Set distinct x/y or convert parent to auto-layout." },
    "hug-cross-axis": { severity: "heuristic", category: "composition", fix: "Set cross-axis sizing to FILL so content fills available space." },
    "unbounded-hug": { severity: "unsafe", category: "composition", fix: 'Set a width + layoutSizingHorizontal:FIXED, or FILL if inside auto-layout. guidelines(topic:"responsive-designs") for details.' },
    "wcag-contrast": { severity: "verbose", category: "accessibility", fix: "Adjust text or background color to meet 4.5:1 (AA)." },
    "wcag-contrast-enhanced": { severity: "verbose", category: "accessibility", fix: "Adjust to meet 7:1 (AAA)." },
    "wcag-non-text-contrast": { severity: "verbose", category: "accessibility", fix: "Adjust fill or background to meet 3:1 contrast." },
    "wcag-target-size": { severity: "verbose", category: "accessibility", fix: "Resize to at least 24x24px." },
    "wcag-text-size": { severity: "verbose", category: "accessibility", fix: "Increase to 12px minimum." },
    "wcag-line-height": { severity: "verbose", category: "accessibility", fix: "Increase line height to 1.5x font size." }
  };
  function lintNodeHandler(params) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g;
      const ruleSet = new Set((params == null ? void 0 : params.rules) || ["all"]);
      const runAll = ruleSet.has("all");
      if (ruleSet.has("wcag") || ruleSet.has("accessibility") || runAll) {
        for (const r of WCAG_RULES) ruleSet.add(r);
      }
      for (const [cat, catRules] of Object.entries(CATEGORY_RULES)) {
        if (ruleSet.has(cat) || runAll) {
          for (const r of catRules) ruleSet.add(r);
        }
      }
      const runWcag = WCAG_RULES.some((r) => ruleSet.has(r));
      const maxDepth = (_a = params == null ? void 0 : params.maxDepth) != null ? _a : 10;
      const maxFindings = (_b = params == null ? void 0 : params.maxFindings) != null ? _b : 50;
      const minSeverity = params == null ? void 0 : params.minSeverity;
      const skipInstances = (_c = params == null ? void 0 : params.skipInstances) != null ? _c : true;
      let root;
      if (params == null ? void 0 : params.nodeId) {
        const node = yield figma.getNodeByIdAsync(params.nodeId);
        if (!node) throw new Error(`Node not found: ${params.nodeId}`);
        root = node;
      } else {
        const sel = figma.currentPage.selection;
        if (sel.length === 0) throw new Error("Nothing selected and no nodeId provided");
        root = sel.length === 1 ? sel[0] : figma.currentPage;
      }
      let localPaintStyleIds = /* @__PURE__ */ new Set();
      let localTextStyleIds = /* @__PURE__ */ new Set();
      let paintStyleEntries = [];
      let colorVarEntries = [];
      let hasFloatVars = false;
      if (runAll || ruleSet.has("hardcoded-token") || ruleSet.has("hardcoded-radius")) {
        const floatVars = yield figma.variables.getLocalVariablesAsync("FLOAT");
        hasFloatVars = floatVars.length > 0;
      }
      if (runAll || ruleSet.has("hardcoded-color")) {
        const paints = yield figma.getLocalPaintStylesAsync();
        localPaintStyleIds = new Set(paints.map((s) => s.id));
        for (const style of paints) {
          if (style.paints.length === 1 && style.paints[0].type === "SOLID") {
            const p = style.paints[0];
            paintStyleEntries.push({ name: style.name, id: style.id, r: p.color.r, g: p.color.g, b: p.color.b, a: (_d = p.opacity) != null ? _d : 1 });
          }
        }
        const colorVars = yield figma.variables.getLocalVariablesAsync("COLOR");
        const collections = yield figma.variables.getLocalVariableCollectionsAsync();
        const defaultModes = new Map(collections.map((c) => [c.id, c.defaultModeId]));
        for (const v of colorVars) {
          const modeId = defaultModes.get(v.variableCollectionId);
          if (!modeId) continue;
          const val = v.valuesByMode[modeId];
          if (!val || typeof val !== "object" || "type" in val) continue;
          const c = val;
          colorVarEntries.push({ name: v.name, id: v.id, r: c.r, g: c.g, b: c.b, a: (_e = c.a) != null ? _e : 1 });
        }
      }
      if (runAll || ruleSet.has("no-text-style")) {
        const texts = yield figma.getLocalTextStylesAsync();
        localTextStyleIds = new Set(texts.map((s) => s.id));
      }
      const issues = [];
      const ctx = { runAll, ruleSet, maxDepth, maxFindings, localPaintStyleIds, localTextStyleIds, hasPaintStyles: localPaintStyleIds.size > 0, hasTextStyles: localTextStyleIds.size > 0, hasColorVars: colorVarEntries.length > 0, paintStyleEntries, colorVarEntries, hasFloatVars, runWcag, skipInstances };
      yield walkNode(root, 0, issues, ctx);
      const truncated = issues.length >= maxFindings;
      const grouped = {};
      for (const issue of issues) {
        if (!grouped[issue.rule]) grouped[issue.rule] = [];
        grouped[issue.rule].push(issue);
      }
      const SEV_ORDER = { error: 0, unsafe: 1, heuristic: 2, style: 3, verbose: 4 };
      const minSevLevel = minSeverity ? (_f = SEV_ORDER[minSeverity]) != null ? _f : 2 : 3;
      const categories = [];
      for (const [rule, ruleIssues] of Object.entries(grouped)) {
        const meta = RULE_META[rule];
        const sev = (meta == null ? void 0 : meta.severity) || "heuristic";
        if (((_g = SEV_ORDER[sev]) != null ? _g : 2) > minSevLevel) continue;
        categories.push({
          rule,
          severity: sev,
          category: (meta == null ? void 0 : meta.category) || "composition",
          count: ruleIssues.length,
          fix: (meta == null ? void 0 : meta.fix) || "Review and fix manually.",
          nodes: ruleIssues.map((i) => {
            const entry = { id: i.nodeId, name: i.nodeName };
            if (i.severity) entry.severity = i.severity;
            if (i.extra) Object.assign(entry, i.extra);
            return entry;
          })
        });
      }
      categories.sort((a, b) => {
        var _a2, _b2;
        return ((_a2 = SEV_ORDER[a.severity]) != null ? _a2 : 2) - ((_b2 = SEV_ORDER[b.severity]) != null ? _b2 : 2);
      });
      const result = { nodeId: root.id, nodeName: root.name, categories };
      if (truncated) {
        const breakdown = categories.map((c) => `${c.rule}: ${c.count}`).join(", ");
        result.warning = `Showing first ${maxFindings} findings (${breakdown}). Increase maxFindings or lint specific rules (e.g. rules: ["hardcoded-color"]) to see more.`;
      }
      return result;
    });
  }
  function walkNode(node, depth, issues, ctx) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      if (issues.length >= ctx.maxFindings) return;
      if (depth > ctx.maxDepth) return;
      if (ctx.runAll || ctx.ruleSet.has("no-autolayout")) {
        if (isFrame(node) && node.layoutMode === "NONE" && "children" in node) {
          const children = node.children;
          const childCount = children.length;
          if (childCount > 1) {
            const direction = detectLayoutDirection(node);
            const allLeaves = children.every((c) => isLeaf(c));
            const severity = allLeaves && childCount <= 3 ? "style" : void 0;
            issues.push({ rule: "no-autolayout", nodeId: node.id, nodeName: node.name, severity, extra: { suggestedDirection: direction } });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("overlapping-children")) {
        if (isFrame(node) && node.layoutMode === "NONE" && "children" in node) {
          const children = node.children;
          if (children.length >= 2) {
            const clusters = /* @__PURE__ */ new Map();
            for (const child of children) {
              if (!("x" in child) || !("y" in child)) continue;
              const key = `${Math.round(child.x)},${Math.round(child.y)}`;
              if (!clusters.has(key)) clusters.set(key, []);
              clusters.get(key).push(child);
            }
            for (const [pos, group] of clusters) {
              if (group.length < 2) continue;
              const [xStr, yStr] = pos.split(",");
              issues.push({
                rule: "overlapping-children",
                nodeId: node.id,
                nodeName: node.name,
                extra: {
                  position: { x: Number(xStr), y: Number(yStr) },
                  count: group.length,
                  childIds: group.map((c) => c.id),
                  childNames: group.map((c) => c.name)
                }
              });
              if (issues.length >= ctx.maxFindings) return;
            }
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("unbounded-hug")) {
        if (isFrame(node) && node.layoutMode !== "NONE" && node.layoutSizingHorizontal === "HUG" && node.layoutSizingVertical === "HUG") {
          const isRoot = !node.parent || node.parent.type === "PAGE";
          const children = "children" in node ? node.children : [];
          const hasTextChildren = children.some((c) => c.type === "TEXT");
          const hasFillChildren = children.some((c) => "layoutSizingHorizontal" in c && c.layoutSizingHorizontal === "FILL");
          const hasLongText = children.some((c) => {
            var _a2, _b2;
            return c.type === "TEXT" && ((_b2 = (_a2 = c.characters) == null ? void 0 : _a2.length) != null ? _b2 : 0) > 20;
          });
          if (isRoot && (hasLongText || hasFillChildren) && !isSmallIntrinsic(node)) {
            issues.push({ rule: "unbounded-hug", nodeId: node.id, nodeName: node.name, extra: { context: "root", hasText: hasTextChildren, hasFillChildren } });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
        if (node.type === "TEXT" && node.parent && "layoutMode" in node.parent && node.parent.layoutMode !== "NONE") {
          const th = node.layoutSizingHorizontal;
          const tv = node.layoutSizingVertical;
          if (th === "HUG" && tv === "HUG") {
            const isShortLabel = ((_b = (_a = node.characters) == null ? void 0 : _a.length) != null ? _b : 0) < 40;
            issues.push({ rule: "unbounded-hug", nodeId: node.id, nodeName: node.name, severity: isShortLabel ? "style" : void 0, extra: { nodeType: "TEXT" } });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("hug-cross-axis")) {
        if (node.parent && "layoutMode" in node.parent && "layoutSizingHorizontal" in node) {
          const parent = node.parent;
          if (parent.layoutMode !== "NONE") {
            const isHorizontal = parent.layoutMode === "HORIZONTAL";
            const parentCross = isHorizontal ? parent.layoutSizingVertical : parent.layoutSizingHorizontal;
            const childCross = isHorizontal ? node.layoutSizingVertical : node.layoutSizingHorizontal;
            if ((parentCross === "FIXED" || parentCross === "FILL") && childCross === "HUG") {
              const crossAxis = isHorizontal ? "vertical" : "horizontal";
              const leafSeverity = isLeaf(node) ? "style" : void 0;
              issues.push({
                rule: "hug-cross-axis",
                nodeId: node.id,
                nodeName: node.name,
                severity: leafSeverity,
                extra: { crossAxis, parentSizing: parentCross, parentId: parent.id, parentName: parent.name }
              });
              if (issues.length >= ctx.maxFindings) return;
            }
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("shape-instead-of-frame")) {
        if (isShape(node) && node.parent && "children" in node.parent) {
          const siblings = node.parent.children;
          const bounds = getAbsoluteBounds(node);
          if (bounds) {
            const overlapping = siblings.filter((s) => {
              if (s.id === node.id) return false;
              const sb = getAbsoluteBounds(s);
              if (!sb) return false;
              return sb.x >= bounds.x && sb.y >= bounds.y && sb.x + sb.width <= bounds.x + bounds.width && sb.y + sb.height <= bounds.y + bounds.height;
            });
            if (overlapping.length > 0) {
              issues.push({ rule: "shape-instead-of-frame", nodeId: node.id, nodeName: node.name, extra: { overlappingIds: overlapping.map((s) => s.id) } });
              if (issues.length >= ctx.maxFindings) return;
            }
          }
        }
      }
      if ((ctx.runAll || ctx.ruleSet.has("hardcoded-color")) && (ctx.hasPaintStyles || ctx.hasColorVars)) {
        const checkPaints = (paints, styleId, hasBoundVar, property) => {
          var _a2;
          if (!paints || !Array.isArray(paints) || paints.length === 0 || paints[0].type !== "SOLID") return;
          if (hasBoundVar) return;
          if (styleId && styleId !== "" && styleId !== figma.mixed) return;
          const color = paints[0].color;
          const opacity = (_a2 = paints[0].opacity) != null ? _a2 : 1;
          const hex = rgbaToHex({ r: color.r, g: color.g, b: color.b, a: opacity });
          const match = findColorMatch(color.r, color.g, color.b, opacity, ctx);
          const extra = { hex, property };
          if (match) {
            extra.matchType = match.type;
            extra.matchName = match.name;
            extra.matchId = match.id;
          }
          issues.push({ rule: "hardcoded-color", nodeId: node.id, nodeName: node.name, extra });
        };
        if ("fills" in node && "fillStyleId" in node) {
          checkPaints(node.fills, node.fillStyleId, ((_d = (_c = node.boundVariables) == null ? void 0 : _c.fills) == null ? void 0 : _d.length) > 0, "fill");
          if (issues.length >= ctx.maxFindings) return;
        }
        if ("strokes" in node && "strokeStyleId" in node) {
          checkPaints(node.strokes, node.strokeStyleId, ((_f = (_e = node.boundVariables) == null ? void 0 : _e.strokes) == null ? void 0 : _f.length) > 0, "stroke");
          if (issues.length >= ctx.maxFindings) return;
        }
      }
      if ((ctx.runAll || ctx.ruleSet.has("hardcoded-token") || ctx.ruleSet.has("hardcoded-radius")) && ctx.hasFloatVars) {
        const bv = node.boundVariables || {};
        if ("cornerRadius" in node) {
          const hasBound = bv.topLeftRadius || bv.topRightRadius || bv.bottomLeftRadius || bv.bottomRightRadius;
          if (!hasBound) {
            const cr = node.cornerRadius;
            if (cr === figma.mixed) {
              const tl = (_g = node.topLeftRadius) != null ? _g : 0;
              const tr = (_h = node.topRightRadius) != null ? _h : 0;
              const br = (_i = node.bottomRightRadius) != null ? _i : 0;
              const bl = (_j = node.bottomLeftRadius) != null ? _j : 0;
              if (tl > 0 || tr > 0 || br > 0 || bl > 0) {
                issues.push({ rule: "hardcoded-token", nodeId: node.id, nodeName: node.name, extra: { property: "cornerRadius", topLeftRadius: tl, topRightRadius: tr, bottomRightRadius: br, bottomLeftRadius: bl } });
                if (issues.length >= ctx.maxFindings) return;
              }
            } else if (typeof cr === "number" && cr > 0) {
              issues.push({ rule: "hardcoded-token", nodeId: node.id, nodeName: node.name, extra: { property: "cornerRadius", value: cr } });
              if (issues.length >= ctx.maxFindings) return;
            }
          }
        }
        if ("strokes" in node && "strokeWeight" in node) {
          const strokes = node.strokes;
          const hasStrokes = Array.isArray(strokes) && strokes.length > 0;
          if (hasStrokes) {
            const sw = node.strokeWeight;
            if (typeof sw === "number" && sw > 0 && !bv.strokeTopWeight && !bv.strokeBottomWeight && !bv.strokeLeftWeight && !bv.strokeRightWeight) {
              issues.push({ rule: "hardcoded-token", nodeId: node.id, nodeName: node.name, extra: { property: "strokeWeight", value: sw } });
              if (issues.length >= ctx.maxFindings) return;
            }
          }
        }
        if ("opacity" in node) {
          const op = node.opacity;
          if (typeof op === "number" && op < 1 && !bv.opacity) {
            issues.push({ rule: "hardcoded-token", nodeId: node.id, nodeName: node.name, extra: { property: "opacity", value: op } });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
        if (isFrame(node) && node.layoutMode !== "NONE") {
          for (const f of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
            if (f in node) {
              const val = node[f];
              if (typeof val === "number" && val > 0 && !bv[f]) {
                issues.push({ rule: "hardcoded-token", nodeId: node.id, nodeName: node.name, extra: { property: f, value: val } });
                if (issues.length >= ctx.maxFindings) return;
              }
            }
          }
        }
      }
      if ((ctx.runAll || ctx.ruleSet.has("no-text-style")) && ctx.hasTextStyles) {
        if (node.type === "TEXT") {
          const textStyleId = node.textStyleId;
          const hasTextVar = node.boundVariables && Object.keys(node.boundVariables).length > 0;
          if (!hasTextVar && (!textStyleId || textStyleId === "" || textStyleId === figma.mixed)) {
            issues.push({ rule: "no-text-style", nodeId: node.id, nodeName: node.name });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("fixed-in-autolayout")) {
        if (isFrame(node) && node.layoutMode !== "NONE" && "children" in node) {
          const parentHugs = node.layoutSizingHorizontal === "HUG" && node.layoutSizingVertical === "HUG";
          if (!parentHugs) {
            for (const child of node.children) {
              if (issues.length >= ctx.maxFindings) break;
              if (!("layoutSizingHorizontal" in child)) continue;
              if (child.layoutPositioning === "ABSOLUTE") continue;
              if (child.layoutSizingHorizontal === "FIXED" && child.layoutSizingVertical === "FIXED") {
                if ("children" in child && child.children.length === 0) continue;
                issues.push({ rule: "fixed-in-autolayout", nodeId: child.id, nodeName: child.name, extra: { parentId: node.id, parentName: node.name, axis: node.layoutMode === "HORIZONTAL" ? "horizontal" : "vertical" } });
              }
            }
          }
          if (issues.length >= ctx.maxFindings) return;
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("overflow-parent")) {
        const overflow = node.overflowDirection;
        const isInstanceInternal = ctx.skipInstances && node.type === "INSTANCE";
        if (isFrame(node) && node.layoutMode !== "NONE" && "children" in node && (!overflow || overflow === "NONE") && !isInstanceInternal) {
          const pW = node.width;
          const pH = node.height;
          const padL = node.paddingLeft || 0;
          const padR = node.paddingRight || 0;
          const padT = node.paddingTop || 0;
          const padB = node.paddingBottom || 0;
          const innerW = pW - padL - padR;
          const innerH = pH - padT - padB;
          const isH = node.layoutMode === "HORIZONTAL";
          const children = node.children;
          const spacing = node.itemSpacing || 0;
          for (const child of children) {
            if (issues.length >= ctx.maxFindings) break;
            if (!("width" in child) || !("height" in child)) continue;
            const crossDim = isH ? child.height : child.width;
            const crossInner = isH ? innerH : innerW;
            if (crossDim > crossInner && crossInner > 0) {
              const axis = isH ? "height" : "width";
              const childSizing = isH ? child.layoutSizingVertical : child.layoutSizingHorizontal;
              const sizingProp = isH ? "layoutSizingVertical" : "layoutSizingHorizontal";
              const minProp = isH ? "minHeight" : "minWidth";
              const childMin = child[minProp];
              let fix;
              if (childSizing === "FIXED") {
                fix = `Reduce ${child.name} ${axis} from ${Math.round(crossDim)} to \u2264${Math.round(crossInner)}, or use ${sizingProp}:"FILL" to fit parent.`;
              } else if (childSizing === "FILL" && childMin && childMin > crossInner) {
                fix = `${minProp} ${childMin} on ${child.name} exceeds available ${Math.round(crossInner)}. Reduce ${minProp} or increase parent.`;
              } else if (childSizing === "HUG") {
                fix = `${child.name} content requires ${Math.round(crossDim)} but only ${Math.round(crossInner)} available. Use ${sizingProp}:"FILL" to constrain to parent.`;
              } else {
                fix = `Use ${sizingProp}:"FILL" to fit parent.`;
              }
              issues.push({
                rule: "overflow-parent",
                nodeId: child.id,
                nodeName: child.name,
                extra: {
                  message: `${child.name} ${axis} ${Math.round(crossDim)} overflows ${node.name} (inner ${axis} ${Math.round(crossInner)}). ${fix}`,
                  parentId: node.id,
                  parentName: node.name
                }
              });
            }
          }
          if (issues.length < ctx.maxFindings) {
            const primaryInner = isH ? innerW : innerH;
            const concreteChildren = children.filter(
              (c) => "width" in c && (isH ? c.layoutSizingHorizontal : c.layoutSizingVertical) !== "FILL"
            );
            if (concreteChildren.length > 0 && primaryInner > 0) {
              const totalConcrete = concreteChildren.reduce((sum, c) => sum + (isH ? c.width : c.height), 0);
              const totalSpacing = (children.length - 1) * spacing;
              const totalUsed = totalConcrete + totalSpacing;
              if (totalUsed > primaryInner) {
                const axis = isH ? "width" : "height";
                const scrollDir = isH ? "HORIZONTAL" : "VERTICAL";
                const parentSizing = isH ? node.layoutSizingHorizontal : node.layoutSizingVertical;
                const childDescs = concreteChildren.map((c) => `${c.name} (${Math.round(isH ? c.width : c.height)})`).join(", ");
                let fix;
                if (parentSizing === "FILL") {
                  fix = `Parent is FILL-sized (${Math.round(primaryInner)} from its parent). Set overflowDirection:"${scrollDir}" for scrollable content, or increase the ancestor that constrains this container.`;
                } else if (parentSizing === "FIXED") {
                  fix = `Increase ${node.name} ${axis} beyond ${Math.round(primaryInner)}, or set overflowDirection:"${scrollDir}" for scrollable content.`;
                } else {
                  const maxProp = isH ? "maxWidth" : "maxHeight";
                  const maxVal = node[maxProp];
                  if (maxVal) {
                    fix = `${maxProp} ${maxVal} constrains ${node.name} below content size. Increase ${maxProp} or set overflowDirection:"${scrollDir}" for scrollable content.`;
                  } else {
                    fix = `Set overflowDirection:"${scrollDir}" for scrollable content.`;
                  }
                }
                issues.push({
                  rule: "overflow-parent",
                  nodeId: node.id,
                  nodeName: node.name,
                  extra: {
                    message: `Children overflow ${node.name} on ${axis}: ${childDescs} + spacing ${Math.round(totalSpacing)} = ${Math.round(totalUsed)} vs ${Math.round(primaryInner)} available. ${fix}`
                  }
                });
              }
            }
          }
          if (issues.length >= ctx.maxFindings) return;
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("default-name")) {
        const defaultNames = ["Frame", "Rectangle", "Ellipse", "Line", "Text", "Group", "Component", "Instance", "Section", "Vector"];
        const isDefault = defaultNames.some((d) => node.name === d || /^.+ \d+$/.test(node.name) && node.name.startsWith(d));
        if (isDefault && node.type !== "PAGE") {
          issues.push({ rule: "default-name", nodeId: node.id, nodeName: node.name });
          if (issues.length >= ctx.maxFindings) return;
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("empty-container")) {
        if (isFrame(node) && node.type !== "SLOT" && "children" in node && node.children.length === 0) {
          const fills = node.fills || [];
          const hasVisualFill = fills.some((f) => f.type === "IMAGE" || f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL" || f.type === "GRADIENT_ANGULAR" || f.type === "GRADIENT_DIAMOND");
          if (!hasVisualFill) {
            issues.push({ rule: "empty-container", nodeId: node.id, nodeName: node.name });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("stale-text-name")) {
        if (node.type === "TEXT") {
          const chars = node.characters;
          if (chars && node.name && node.name !== chars && node.name !== chars.slice(0, node.name.length)) {
            issues.push({ rule: "stale-text-name", nodeId: node.id, nodeName: node.name, extra: { characters: chars.slice(0, 60) } });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("no-text-property")) {
        if (node.type === "TEXT" && isInsideComponent(node)) {
          const refs = node.componentPropertyReferences;
          if (!refs || !refs.characters) {
            issues.push({ rule: "no-text-property", nodeId: node.id, nodeName: node.name });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runAll || ctx.ruleSet.has("component-bindings")) {
        if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
          const audit = auditComponentBindings(node);
          for (const t of audit.unboundText) {
            issues.push({ rule: "component-bindings", nodeId: t.id, nodeName: t.name, extra: { issue: "unbound-text", characters: t.characters } });
            if (issues.length >= ctx.maxFindings) return;
          }
          for (const p of audit.orphanedProperties) {
            issues.push({ rule: "component-bindings", nodeId: node.id, nodeName: node.name, severity: "unsafe", extra: { issue: "orphaned-property", propertyKey: p.key, propertyName: p.name } });
            if (issues.length >= ctx.maxFindings) return;
          }
          for (const n of audit.unboundNested) {
            issues.push({ rule: "component-bindings", nodeId: n.id, nodeName: n.name, severity: "style", extra: { issue: "unexposed-nested", path: n.path, characters: n.characters } });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runWcag && (ctx.ruleSet.has("wcag-contrast") || ctx.ruleSet.has("wcag-contrast-enhanced"))) {
        if (node.type === "TEXT") {
          const textNode = node;
          const fontSize = textNode.fontSize;
          const fontName = textNode.fontName;
          if (fontSize !== figma.mixed && fontName !== figma.mixed) {
            const fgColor = getTextFillColor(textNode);
            if (fgColor) {
              const bgColor = resolveBackgroundColor(node);
              if (bgColor !== null) {
                const nodeOpacity = getEffectiveOpacity(node);
                const effectiveAlpha = fgColor.a * nodeOpacity;
                const composited = alphaComposite(
                  fgColor.r,
                  fgColor.g,
                  fgColor.b,
                  effectiveAlpha,
                  bgColor.r,
                  bgColor.g,
                  bgColor.b
                );
                const fontWeight = inferFontWeight(fontName.style);
                const large = isLargeText(fontSize, fontWeight);
                const result = checkContrastPair(composited, bgColor, large);
                const fgVar = yield getFillTokenName(node);
                const bgVar = yield getBackgroundTokenName(node);
                const fgHex = rgbaToHex(__spreadProps(__spreadValues({}, fgColor), { a: effectiveAlpha }));
                const bgHex = rgbaToHex({ r: bgColor.r, g: bgColor.g, b: bgColor.b, a: 1 });
                const foreground = fgVar || fgHex;
                const background = bgVar || bgHex;
                if (ctx.ruleSet.has("wcag-contrast") && !result.passesAA) {
                  issues.push({
                    rule: "wcag-contrast",
                    nodeId: node.id,
                    nodeName: node.name,
                    extra: {
                      ratio: result.ratio,
                      required: result.aaRequired,
                      level: "AA",
                      foreground,
                      background,
                      fontSize,
                      fontWeight,
                      isLargeText: large
                    }
                  });
                  if (issues.length >= ctx.maxFindings) return;
                }
                if (ctx.ruleSet.has("wcag-contrast-enhanced") && result.passesAA && !result.passesAAA) {
                  issues.push({
                    rule: "wcag-contrast-enhanced",
                    nodeId: node.id,
                    nodeName: node.name,
                    extra: {
                      ratio: result.ratio,
                      required: result.aaaRequired,
                      level: "AAA",
                      foreground,
                      background,
                      fontSize,
                      fontWeight,
                      isLargeText: large
                    }
                  });
                  if (issues.length >= ctx.maxFindings) return;
                }
              }
            }
          }
        }
      }
      if (ctx.runWcag && ctx.ruleSet.has("wcag-non-text-contrast")) {
        if (node.type !== "TEXT" && node.type !== "PAGE" && "fills" in node) {
          const nodeFill = getNodeFillColor(node);
          if (nodeFill && node.parent) {
            const parentFill = resolveBackgroundColor(node);
            if (parentFill !== null) {
              const result = checkContrastPair(nodeFill, parentFill);
              if (result.ratio < 3) {
                const fillVar = yield getFillTokenName(node);
                const bgVar = yield getBackgroundTokenName(node);
                const nodeHex = rgbaToHex(__spreadProps(__spreadValues({}, nodeFill), { a: 1 }));
                const parentHex = rgbaToHex({ r: parentFill.r, g: parentFill.g, b: parentFill.b, a: 1 });
                const bothBound = !!(fillVar && bgVar);
                issues.push({
                  rule: "wcag-non-text-contrast",
                  nodeId: node.id,
                  nodeName: node.name,
                  severity: bothBound ? "style" : void 0,
                  extra: {
                    ratio: result.ratio,
                    required: 3,
                    level: "AA",
                    fill: fillVar || nodeHex,
                    background: bgVar || parentHex
                  }
                });
                if (issues.length >= ctx.maxFindings) return;
              }
            }
          }
        }
      }
      if (ctx.runWcag && ctx.ruleSet.has("wcag-target-size")) {
        if (looksInteractive(node) && "width" in node && "height" in node) {
          const w = node.width;
          const h = node.height;
          const MIN_TARGET = 24;
          if (w < MIN_TARGET || h < MIN_TARGET) {
            issues.push({
              rule: "wcag-target-size",
              nodeId: node.id,
              nodeName: node.name,
              extra: {
                width: Math.round(w * 100) / 100,
                height: Math.round(h * 100) / 100,
                minimumRequired: MIN_TARGET,
                failingDimension: w < MIN_TARGET && h < MIN_TARGET ? "both" : w < MIN_TARGET ? "width" : "height"
              }
            });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runWcag && ctx.ruleSet.has("wcag-text-size")) {
        if (node.type === "TEXT") {
          const fontSize = node.fontSize;
          if (fontSize !== figma.mixed && typeof fontSize === "number" && fontSize < 12) {
            issues.push({
              rule: "wcag-text-size",
              nodeId: node.id,
              nodeName: node.name,
              extra: { fontSize, minimumRecommended: 12 }
            });
            if (issues.length >= ctx.maxFindings) return;
          }
        }
      }
      if (ctx.runWcag && ctx.ruleSet.has("wcag-line-height")) {
        if (node.type === "TEXT") {
          const textNode = node;
          const fontSize = textNode.fontSize;
          const lineHeight = textNode.lineHeight;
          if (fontSize !== figma.mixed && lineHeight !== figma.mixed) {
            const fs = fontSize;
            const lh = lineHeight;
            let lineHeightPx = null;
            if (lh.unit === "PIXELS") {
              lineHeightPx = lh.value;
            } else if (lh.unit === "PERCENT") {
              lineHeightPx = lh.value / 100 * fs;
            }
            if (lineHeightPx !== null) {
              const ratio = lineHeightPx / fs;
              const REQUIRED_RATIO = 1.5;
              if (ratio < REQUIRED_RATIO) {
                issues.push({
                  rule: "wcag-line-height",
                  nodeId: node.id,
                  nodeName: node.name,
                  extra: {
                    lineHeightPx: Math.round(lineHeightPx * 100) / 100,
                    fontSize: fs,
                    ratio: Math.round(ratio * 100) / 100,
                    requiredRatio: REQUIRED_RATIO,
                    recommendedLineHeight: Math.ceil(fs * REQUIRED_RATIO)
                  }
                });
                if (issues.length >= ctx.maxFindings) return;
              }
            }
          }
        }
      }
      if ("children" in node) {
        if (ctx.skipInstances && node.type === "INSTANCE") return;
        for (const child of node.children) {
          if (issues.length >= ctx.maxFindings) break;
          yield walkNode(child, depth + 1, issues, ctx);
        }
      }
    });
  }
  function findColorMatch(r, g, b, a, ctx) {
    const eps = 0.02;
    for (const e of ctx.paintStyleEntries) {
      if (Math.abs(e.r - r) < eps && Math.abs(e.g - g) < eps && Math.abs(e.b - b) < eps && Math.abs(e.a - a) < eps)
        return { type: "style", name: e.name, id: e.id };
    }
    for (const e of ctx.colorVarEntries) {
      if (Math.abs(e.r - r) < eps && Math.abs(e.g - g) < eps && Math.abs(e.b - b) < eps && Math.abs(e.a - a) < eps)
        return { type: "variable", name: e.name, id: e.id };
    }
    return null;
  }
  function isFrame(node) {
    return node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET" || node.type === "INSTANCE" || node.type === "SLOT";
  }
  function isInsideComponent(node) {
    let p = node.parent;
    while (p) {
      if (p.type === "COMPONENT" || p.type === "COMPONENT_SET") return true;
      p = p.parent;
    }
    return false;
  }
  var SHAPE_TYPES = /* @__PURE__ */ new Set(["RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "VECTOR", "LINE"]);
  function isShape(node) {
    return SHAPE_TYPES.has(node.type);
  }
  function isLeaf(node) {
    if (node.type === "TEXT") return true;
    if (SHAPE_TYPES.has(node.type)) return true;
    if ("children" in node && node.children.length === 0) return true;
    return false;
  }
  function getAbsoluteBounds(node) {
    if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      return node.absoluteBoundingBox;
    }
    if ("x" in node && "width" in node) {
      return { x: node.x, y: node.y, width: node.width, height: node.height };
    }
    return null;
  }
  function detectLayoutDirection(frame) {
    const children = frame.children;
    if (children.length < 2) return "VERTICAL";
    let xVariance = 0;
    let yVariance = 0;
    for (let i = 1; i < children.length; i++) {
      xVariance += Math.abs(children[i].x - children[i - 1].x);
      yVariance += Math.abs(children[i].y - children[i - 1].y);
    }
    return yVariance >= xVariance ? "VERTICAL" : "HORIZONTAL";
  }
  function getFillTokenName(node) {
    return __async(this, null, function* () {
      const bv = node.boundVariables;
      if (bv == null ? void 0 : bv.fills) {
        const fills = Array.isArray(bv.fills) ? bv.fills : [bv.fills];
        for (const f of fills) {
          if (f == null ? void 0 : f.id) {
            try {
              const v = yield figma.variables.getVariableByIdAsync(f.id);
              if (v) return v.name;
            } catch (e) {
            }
          }
        }
      }
      const styleId = node.fillStyleId;
      if (styleId && styleId !== "" && styleId !== figma.mixed) {
        try {
          const style = yield figma.getStyleByIdAsync(styleId);
          if (style) return style.name;
        } catch (e) {
        }
      }
      return null;
    });
  }
  function getBackgroundTokenName(node) {
    return __async(this, null, function* () {
      let current = node.parent;
      while (current) {
        if ("fills" in current) {
          const fills = current.fills;
          if (fills !== figma.mixed && Array.isArray(fills) && fills.length > 0) {
            const hasFill = fills.some((f) => f.visible !== false && f.type === "SOLID");
            if (hasFill) return getFillTokenName(current);
          }
        }
        current = current.parent;
      }
      return null;
    });
  }
  function getTextFillColor(node) {
    var _a;
    const fills = node.fills;
    if (fills === figma.mixed) return null;
    if (!Array.isArray(fills) || fills.length === 0) return null;
    for (let i = fills.length - 1; i >= 0; i--) {
      const fill = fills[i];
      if (fill.visible === false) continue;
      if (fill.type !== "SOLID") return null;
      return { r: fill.color.r, g: fill.color.g, b: fill.color.b, a: (_a = fill.opacity) != null ? _a : 1 };
    }
    return null;
  }
  function getNodeFillColor(node) {
    if (!("fills" in node)) return null;
    const fills = node.fills;
    if (fills === figma.mixed || !Array.isArray(fills)) return null;
    for (let i = fills.length - 1; i >= 0; i--) {
      const fill = fills[i];
      if (fill.visible === false) continue;
      if (fill.type !== "SOLID") return null;
      return { r: fill.color.r, g: fill.color.g, b: fill.color.b };
    }
    return null;
  }
  function resolveBackgroundColor(node) {
    var _a, _b;
    let bgR = 1, bgG = 1, bgB = 1;
    const ancestors = [];
    let current = node.parent;
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    ancestors.reverse();
    for (const ancestor of ancestors) {
      if (!("fills" in ancestor)) continue;
      const fills = ancestor.fills;
      if (fills === figma.mixed || !Array.isArray(fills)) continue;
      for (const fill of fills) {
        if (fill.visible === false) continue;
        if (fill.type === "SOLID") {
          const fillOpacity = (_a = fill.opacity) != null ? _a : 1;
          const nodeOpacity = "opacity" in ancestor ? (_b = ancestor.opacity) != null ? _b : 1 : 1;
          const effectiveAlpha = fillOpacity * nodeOpacity;
          if (effectiveAlpha >= 0.999) {
            bgR = fill.color.r;
            bgG = fill.color.g;
            bgB = fill.color.b;
          } else {
            const c = alphaComposite(fill.color.r, fill.color.g, fill.color.b, effectiveAlpha, bgR, bgG, bgB);
            bgR = c.r;
            bgG = c.g;
            bgB = c.b;
          }
        } else if (fill.type !== "SOLID") {
          return null;
        }
      }
    }
    return { r: bgR, g: bgG, b: bgB };
  }
  function getEffectiveOpacity(node) {
    var _a;
    let opacity = 1;
    let current = node;
    while (current) {
      if ("opacity" in current) {
        opacity *= (_a = current.opacity) != null ? _a : 1;
      }
      current = current.parent;
    }
    return opacity;
  }
  function fixAutolayoutSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!isFrame(node)) throw new Error(`Node ${p.nodeId} is ${node.type}, not a FRAME`);
      if (node.layoutMode !== "NONE") return { skipped: true, reason: "Already has auto-layout" };
      const direction = p.layoutMode || detectLayoutDirection(node);
      node.layoutMode = direction;
      if (p.itemSpacing !== void 0) {
        node.itemSpacing = p.itemSpacing;
      }
      return { layoutMode: direction };
    });
  }
  var figmaHandlers7 = {
    lint_node: lintNodeHandler,
    lint_fix_autolayout: (p) => batchHandler(p, fixAutolayoutSingle)
  };

  // src/handlers/inline-tree.ts
  function resolveEffectiveSizing(p, axis) {
    if (axis === "H") return p.layoutSizingHorizontal || (p.width !== void 0 ? "FIXED" : "HUG");
    return p.layoutSizingVertical || (p.height !== void 0 ? "FIXED" : "HUG");
  }
  var AL_PARAMS = [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "padding",
    "itemSpacing",
    "primaryAxisAlignItems",
    "counterAxisAlignItems",
    "counterAxisSpacing"
  ];
  function resolveChildLayoutMode(p) {
    if (p.layoutMode === "NONE") return { mode: "NONE", explicitNone: true };
    if (p.layoutMode) return { mode: p.layoutMode, explicitNone: false };
    if (AL_PARAMS.some((k) => p[k] !== void 0)) return { mode: "VERTICAL", explicitNone: false };
    if (p.layoutSizingHorizontal === "HUG" || p.layoutSizingVertical === "HUG") return { mode: "VERTICAL", explicitNone: false };
    if (p.layoutWrap && p.layoutWrap !== "NO_WRAP") return { mode: "HORIZONTAL", explicitNone: false };
    return { mode: "NONE", explicitNone: false };
  }
  function childName(child) {
    return child.name || child.text || child.componentPropertyName || child.type || "child";
  }
  function childHasFillOrHug(child) {
    const h = child.layoutSizingHorizontal;
    const v = child.layoutSizingVertical;
    return h === "FILL" || h === "HUG" || v === "FILL" || v === "HUG";
  }
  function parentHasDimensions(p) {
    return p.width !== void 0 && p.height !== void 0;
  }
  function buildInlineTree(children, parentCtx, parentPath) {
    return children.map((child) => {
      var _a;
      const type = child.type || "unknown";
      const name = childName(child);
      const path = parentPath ? `${parentPath} > ${name}` : name;
      if (type === "text" || type === "instance" || type === "unknown") {
        return { raw: child, type, name, path, parent: parentCtx, layoutMode: "NONE", explicitNone: false, children: [] };
      }
      const { mode, explicitNone } = resolveChildLayoutMode(child);
      const childCtx = {
        layoutMode: mode,
        explicitNone,
        sizingH: resolveEffectiveSizing(child, "H"),
        sizingV: resolveEffectiveSizing(child, "V")
      };
      const nested = ((_a = child.children) == null ? void 0 : _a.length) ? buildInlineTree(child.children, childCtx, path) : [];
      return { raw: child, type, name, path, parent: parentCtx, layoutMode: mode, explicitNone, children: nested };
    });
  }
  function validateInlineTree(nodes, parentRaw, parentPath, hints, inferences) {
    const parentIsNone = (parentRaw.layoutMode || "NONE") === "NONE" && !parentRaw.layoutMode;
    const parentExplicitNone = parentRaw.layoutMode === "NONE";
    const anyChildNeedsAL = nodes.some((n) => childHasFillOrHug(n.raw));
    if (anyChildNeedsAL && parentExplicitNone) {
      const culprit = nodes.find((n) => childHasFillOrHug(n.raw));
      throw new Error(
        `layoutMode:'NONE' conflicts with child '${culprit.name}' using FILL/HUG sizing. Remove layoutMode:'NONE' to let auto-layout be inferred, or use FIXED sizing on children.`
      );
    }
    if (anyChildNeedsAL && parentIsNone) {
      const hasDims = parentHasDimensions(parentRaw);
      const culprit = nodes.find((n) => childHasFillOrHug(n.raw));
      const confidence = hasDims ? "deterministic" : "ambiguous";
      const reason = hasDims ? "Fixed-size parent with FILL/HUG children \u2014 container intent" : "No dimensions \u2014 container size unknown, promoted to VERTICAL";
      const from = parentRaw.layoutMode;
      parentRaw.layoutMode = "VERTICAL";
      inferences.push({ path: parentPath || "(root)", field: "layoutMode", from, to: "VERTICAL", confidence, reason });
      hints.push({
        type: "confirm",
        message: `Promoted to auto-layout (VERTICAL) because child '${culprit.name}' uses FILL/HUG sizing.`
      });
      const updatedCtx = {
        layoutMode: "VERTICAL",
        explicitNone: false,
        sizingH: resolveEffectiveSizing(parentRaw, "H"),
        sizingV: resolveEffectiveSizing(parentRaw, "V")
      };
      for (const node of nodes) node.parent = updatedCtx;
    }
    for (const node of nodes) {
      const { parent, raw, path } = node;
      if (parent.layoutMode === "NONE") {
        if (node.children.length) {
          validateInlineTree(node.children, raw, path, hints, inferences);
        }
        continue;
      }
      const isVertical = parent.layoutMode === "VERTICAL";
      const axes = [
        {
          field: "layoutSizingHorizontal",
          role: isVertical ? "cross" : "primary",
          dimension: raw.width,
          sizing: raw.layoutSizingHorizontal,
          parentSizing: parent.sizingH
        },
        {
          field: "layoutSizingVertical",
          role: isVertical ? "primary" : "cross",
          dimension: raw.height,
          sizing: raw.layoutSizingVertical,
          parentSizing: parent.sizingV
        }
      ];
      for (const axis of axes) {
        const { field, role, dimension, sizing, parentSizing } = axis;
        const dimName = field === "layoutSizingHorizontal" ? "width" : "height";
        if (parentSizing === "HUG" && sizing === "FILL") {
          inferences.push({
            path,
            field,
            from: "FILL",
            to: "FILL",
            confidence: "ambiguous",
            reason: `FILL inside HUG parent \u2014 siblings determine width`
          });
          hints.push({
            type: "warn",
            message: `Child '${node.name}' has ${field}:'FILL' inside HUG parent \u2014 FILL children adopt the width of the widest sibling. Set ${dimName} on parent for explicit sizing.`
          });
        }
        if (sizing === "FILL" && dimension !== void 0) {
          throw new Error(
            `Child '${node.name}' has both ${field}:'FILL' and ${dimName} \u2014 these conflict. Use FILL to stretch to parent, or set ${dimName} with ${field}:'FIXED'.`
          );
        }
        if (sizing === "FIXED" && dimension === void 0) {
          const from = "FIXED";
          if (role === "cross") {
            raw[field] = "FILL";
            inferences.push({
              path,
              field,
              from,
              to: "FILL",
              confidence: "deterministic",
              reason: "FIXED on cross-axis without dimension \u2014 stretch to parent"
            });
            hints.push({
              type: "confirm",
              message: `Child '${node.name}' has ${field}:'FIXED' on cross-axis without ${dimName} \u2014 using FILL to stretch to parent.`
            });
          } else {
            raw[field] = "HUG";
            inferences.push({
              path,
              field,
              from,
              to: "HUG",
              confidence: "deterministic",
              reason: "FIXED on primary axis without dimension \u2014 content-size"
            });
            hints.push({
              type: "confirm",
              message: `Child '${node.name}' has ${field}:'FIXED' on primary axis without ${dimName} \u2014 using HUG to content-size.`
            });
          }
        }
      }
      if (node.children.length) {
        validateInlineTree(node.children, raw, path, hints, inferences);
      }
    }
  }
  function formatDiff(inferences) {
    const ambiguous = inferences.filter((i) => i.confidence === "ambiguous");
    if (ambiguous.length === 0) return "";
    const byPath = /* @__PURE__ */ new Map();
    for (const inf of ambiguous) {
      const group = byPath.get(inf.path) || [];
      group.push(inf);
      byPath.set(inf.path, group);
    }
    const lines = [];
    for (const [path, infs] of byPath) {
      lines.push(path);
      for (const inf of infs) {
        const fromStr = inf.from === void 0 ? "(not set)" : JSON.stringify(inf.from);
        const toStr = JSON.stringify(inf.to);
        lines.push(`- ${inf.field}: ${fromStr}`);
        lines.push(`+ ${inf.field}: ${toStr}  # ${inf.reason}`);
      }
      lines.push("");
    }
    return lines.join("\n").trimEnd();
  }
  function buildCorrectedPayload(mutatedParams, originalParams) {
    if (!originalParams) {
      const clone = JSON.parse(JSON.stringify(mutatedParams));
      stripInternalFields(clone);
      return clone;
    }
    const base = JSON.parse(JSON.stringify(originalParams));
    applyInferredFields(base, mutatedParams);
    stripInternalFields(base);
    return base;
  }
  var INFERRED_FIELDS = ["layoutMode", "layoutSizingHorizontal", "layoutSizingVertical"];
  function applyInferredFields(target, source) {
    for (const field of INFERRED_FIELDS) {
      if (source[field] !== void 0) target[field] = source[field];
    }
    if (Array.isArray(target.children) && Array.isArray(source.children)) {
      for (let i = 0; i < target.children.length && i < source.children.length; i++) {
        applyInferredFields(target.children[i], source.children[i]);
      }
    }
  }
  var INTERNAL_FIELDS = /* @__PURE__ */ new Set(["_skipOverlapCheck", "_inlineHints", "_originalParams", "_caps"]);
  function stripInternalFields(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const key of INTERNAL_FIELDS) {
      delete obj[key];
    }
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) stripInternalFields(child);
    }
  }
  function validateAndFixInlineChildren(parentParams, hints) {
    const parentLM = parentParams.layoutMode || "";
    const explicitNone = parentParams.layoutMode === "NONE";
    const parentCtx = {
      layoutMode: parentLM || "NONE",
      explicitNone,
      sizingH: resolveEffectiveSizing(parentParams, "H"),
      sizingV: resolveEffectiveSizing(parentParams, "V")
    };
    const parentName = parentParams.name || "(root)";
    const inferences = [];
    if (parentLM && parentLM !== "NONE") {
      const axes = [
        { field: "layoutSizingHorizontal", dim: "width" },
        { field: "layoutSizingVertical", dim: "height" }
      ];
      for (const { field, dim } of axes) {
        if (parentParams[field] === "FIXED" && parentParams[dim] === void 0) {
          parentParams[field] = "HUG";
          inferences.push({
            path: parentName,
            field,
            from: "FIXED",
            to: "HUG",
            confidence: "deterministic",
            reason: `FIXED without ${dim} \u2014 using HUG to size from content`
          });
          hints.push({
            type: "confirm",
            message: `${field}:'FIXED' without ${dim} \u2014 using HUG to size from content + padding.`
          });
          if (field === "layoutSizingHorizontal") parentCtx.sizingH = "HUG";
          else parentCtx.sizingV = "HUG";
        }
      }
    }
    const tree = buildInlineTree(parentParams.children, parentCtx, parentName);
    validateInlineTree(tree, parentParams, parentName, hints, inferences);
    const hasAmbiguity = inferences.some((i) => i.confidence === "ambiguous");
    return { hasAmbiguity, inferences };
  }

  // src/handlers/stage.ts
  function createStageContainer(p, name) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const stage = figma.createFrame();
      stage.name = `[STAGED] ${name}`;
      stage.fills = [];
      const meta = {
        targetParentId: p.parentId || null,
        targetPageId: figma.currentPage.id,
        // remember the page for page-root stages
        targetX: (_a = p.x) != null ? _a : 0,
        targetY: (_b = p.y) != null ? _b : 0
      };
      const targetParent = p.parentId ? yield figma.getNodeByIdAsync(p.parentId) : null;
      if (targetParent && "layoutMode" in targetParent && targetParent.layoutMode !== "NONE") {
        const tp = targetParent;
        stage.layoutMode = tp.layoutMode;
        stage.resize(tp.width, tp.height);
        stage.layoutSizingHorizontal = "FIXED";
        stage.layoutSizingVertical = "FIXED";
        if (tp.itemSpacing) stage.itemSpacing = tp.itemSpacing;
        if (tp.paddingTop) stage.paddingTop = tp.paddingTop;
        if (tp.paddingRight) stage.paddingRight = tp.paddingRight;
        if (tp.paddingBottom) stage.paddingBottom = tp.paddingBottom;
        if (tp.paddingLeft) stage.paddingLeft = tp.paddingLeft;
        if (tp.primaryAxisAlignItems) stage.primaryAxisAlignItems = tp.primaryAxisAlignItems;
        if (tp.counterAxisAlignItems) stage.counterAxisAlignItems = tp.counterAxisAlignItems;
      } else if (p.width && p.height) {
        stage.resize(p.width, p.height);
      } else {
        stage.resize(p.width || 400, p.height || 400);
      }
      stage.x = ((_c = p.x) != null ? _c : 0) + 50;
      stage.y = ((_d = p.y) != null ? _d : 0) + 50;
      stage.setPluginData("_stageMetadata", JSON.stringify(meta));
      figma.currentPage.appendChild(stage);
      return stage;
    });
  }
  function commitStaged(stagedId) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const hints = [];
      const node = yield figma.getNodeByIdAsync(stagedId);
      if (!node) throw new Error(`Staged node not found: ${stagedId}`);
      let stageContainer = null;
      let contentNode = node;
      if (node.type === "FRAME" && node.name.startsWith("[STAGED]")) {
        stageContainer = node;
        if ("children" in stageContainer && stageContainer.children.length > 0) {
          contentNode = stageContainer.children[0];
        }
      } else if (((_a = node.parent) == null ? void 0 : _a.type) === "FRAME" && node.parent.name.startsWith("[STAGED]")) {
        stageContainer = node.parent;
        contentNode = node;
      }
      if (!stageContainer) {
        throw new Error(`Node ${stagedId} is not in a stage container. Only [STAGED] nodes can be committed.`);
      }
      const metaStr = stageContainer.getPluginData("_stageMetadata");
      if (!metaStr) throw new Error("Stage container missing metadata \u2014 cannot determine commit target.");
      const meta = JSON.parse(metaStr);
      let targetParent;
      if (meta.targetParentId) {
        targetParent = yield figma.getNodeByIdAsync(meta.targetParentId);
        if (!targetParent) throw new Error(`Original target parent not found: ${meta.targetParentId}`);
      } else {
        targetParent = yield figma.getNodeByIdAsync(meta.targetPageId);
        if (!targetParent) {
          targetParent = figma.currentPage;
        }
        if (targetParent.type === "PAGE" && targetParent.id !== figma.currentPage.id) {
          yield targetParent.loadAsync();
        }
      }
      if ("appendChild" in targetParent) {
        targetParent.appendChild(contentNode);
      }
      if ("x" in contentNode) {
        contentNode.x = (_b = meta.targetX) != null ? _b : 0;
        contentNode.y = (_c = meta.targetY) != null ? _c : 0;
      }
      stageContainer.remove();
      const targetDesc = meta.targetParentId ? `parent ${meta.targetParentId}` : "page";
      hints.push({ type: "confirm", message: `Committed staged node to ${targetDesc}.` });
      return { id: contentNode.id, hints };
    });
  }
  var figmaHandlers8 = {
    commit: (params) => __async(null, null, function* () {
      const id = params.id;
      if (!id) throw new Error("Missing id \u2014 provide the staged node ID to commit.");
      const { id: committedId, hints } = yield commitStaged(id);
      const result = { id: committedId, status: "created" };
      if (hints.length > 0) result.hints = hints;
      return { results: [result] };
    })
  };

  // ../core/dist/tools/endpoint.js
  function pickFields2(obj, fields) {
    if (fields.includes("*")) return obj;
    const identity = ["id", "name", "type"];
    const keep = /* @__PURE__ */ new Set([...fields, ...identity]);
    const out = {};
    for (const key of Object.keys(obj)) {
      if (keep.has(key)) out[key] = obj[key];
    }
    const requested = fields.filter((f) => !identity.includes(f));
    if (requested.length > 0) {
      const found = requested.filter((f) => f in obj);
      if (found.length === 0) {
        const available = Object.keys(obj).filter((k) => !identity.includes(k));
        out._warning = `Requested fields [${requested.join(", ")}] not found. Available: [${available.join(", ")}]`;
      }
    }
    return out;
  }
  function paginate(items, offset = 0, limit = 100) {
    const sliced = items.slice(offset, offset + limit);
    return { totalCount: items.length, returned: sliced.length, offset, limit, items: sliced };
  }
  function createDispatcher(handlers) {
    const supported = Object.keys(handlers).join(", ");
    return (params) => __async(null, null, function* () {
      var _a;
      const method = params.method;
      const handler = handlers[method];
      if (!handler) throw new Error(`Method '${method}' not supported. Available: ${supported}`);
      let result = yield handler(params);
      if (method === "get" && ((_a = params.fields) == null ? void 0 : _a.length) && result && typeof result === "object") {
        result = pickFields2(result, params.fields);
      }
      return result;
    });
  }

  // src/handlers/create-text.ts
  function getFontStyle2(weight) {
    const map = {
      100: "Thin",
      200: "Extra Light",
      300: "Light",
      400: "Regular",
      500: "Medium",
      600: "Semi Bold",
      700: "Bold",
      800: "Extra Bold",
      900: "Black"
    };
    return map[weight] || "Regular";
  }
  function stripStyle(s) {
    return s.toLowerCase().replace(/[\s\-_]/g, "");
  }
  var _fontCache = null;
  function resolveFontAsync(family, style) {
    return __async(this, null, function* () {
      try {
        yield figma.loadFontAsync({ family, style });
        return { family, style };
      } catch (e) {
      }
      const normalized = style.replace(/([a-z])([A-Z])/g, "$1 $2");
      if (normalized !== style) {
        try {
          yield figma.loadFontAsync({ family, style: normalized });
          return { family, style: normalized };
        } catch (e) {
        }
      }
      if (!_fontCache) {
        const raw = yield figma.listAvailableFontsAsync();
        _fontCache = raw.map((f) => {
          var _a;
          return (_a = f.fontName) != null ? _a : f;
        });
      }
      const familyFonts = _fontCache.filter((f) => {
        var _a;
        return ((_a = f.family) == null ? void 0 : _a.toLowerCase()) === family.toLowerCase();
      });
      const stripped = stripStyle(style);
      const match = familyFonts.find((f) => stripStyle(f.style) === stripped);
      if (match) {
        yield figma.loadFontAsync(match);
        return match;
      }
      if (familyFonts.length === 0) {
        const looseFamilyFonts = _fontCache.filter((f) => {
          var _a;
          return ((_a = f.family) == null ? void 0 : _a.toLowerCase()) === family.toLowerCase();
        });
        const looseMatch = looseFamilyFonts.find((f) => stripStyle(f.style) === stripped);
        if (looseMatch) {
          yield figma.loadFontAsync(looseMatch);
          return looseMatch;
        }
      }
      const available = [...new Set(familyFonts.map((f) => f.style))];
      throw new Error(`Font "${family}" style "${style}" not found. Available styles: [${available.join(", ")}]. Use fonts(method: "list") to see all fonts.`);
    });
  }
  function clearFontCache() {
    _fontCache = null;
  }
  var TEXT_CREATE_KEYS = /* @__PURE__ */ new Set([
    ...textCreate,
    "fontColorVariableId",
    // accepted but not in schema
    "fillColor",
    "fillVariableName",
    "fillStyleName"
    // aliases → fills via batchHandler
  ]);
  function prepCreateText(params) {
    return __async(this, null, function* () {
      const items = params.items || [params];
      clearFontCache();
      const { byName: textStyleByName, fontsToLoad: styleFonts, localStyles } = yield resolveTextStylesForBatch(items);
      const textStyles = localStyles.length > 0 || items.some((p) => p.textStyleName) ? localStyles : null;
      const hasFillStyle = items.some((p) => {
        var _a;
        return ((_a = p.fills) == null ? void 0 : _a._style) || p.fontColorStyleName;
      });
      let paintStyles = null;
      if (hasFillStyle) {
        paintStyles = yield figma.getLocalPaintStylesAsync();
      }
      const fontRequests = [];
      for (const p of items) {
        fontRequests.push({
          family: p.fontFamily || "Inter",
          style: p.fontStyle || getFontStyle2(p.fontWeight || 400)
        });
      }
      for (const fn of styleFonts) {
        fontRequests.push({ family: fn.family, style: fn.style });
      }
      const resolvedTextStyleMap = /* @__PURE__ */ new Map();
      for (const [, style] of textStyleByName) {
        if (style == null ? void 0 : style.id) resolvedTextStyleMap.set(style.id, style);
      }
      for (const p of items) {
        if (p.textStyleId && !resolvedTextStyleMap.has(p.textStyleId)) {
          const s = yield figma.getStyleByIdAsync(p.textStyleId);
          if ((s == null ? void 0 : s.type) === "TEXT") {
            resolvedTextStyleMap.set(p.textStyleId, s);
            const fn = s.fontName;
            if (fn) fontRequests.push({ family: fn.family, style: fn.style });
          }
        }
      }
      const resolvedFontMap = /* @__PURE__ */ new Map();
      const seen = /* @__PURE__ */ new Set();
      for (const { family, style } of fontRequests) {
        const key = `${family}::${style}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const resolved = yield resolveFontAsync(family, style);
        resolvedFontMap.set(key, resolved);
      }
      const { setCharacters: setCharacters2 } = yield Promise.resolve().then(() => (init_figma_helpers(), figma_helpers_exports));
      return { textStyles, textStyleByName, paintStyles, resolvedTextStyleMap, resolvedFontMap, setCharacters: setCharacters2 };
    });
  }
  function createTextSingle(p, ctx) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const {
        x = 0,
        y = 0,
        text = (_a = p.characters) != null ? _a : "Text",
        fontSize = 14,
        fontWeight = 400,
        // characters: legacy fallback, aliased to text at MCP level
        fontFamily = "Inter",
        fontStyle,
        fills,
        name = "",
        parentId,
        textStyleId,
        textStyleName,
        textAlignHorizontal,
        textAlignVertical,
        layoutSizingHorizontal,
        layoutSizingVertical,
        textAutoResize,
        componentPropertyName,
        componentId,
        width
      } = p;
      const textNode = figma.createText();
      try {
        textNode.x = x;
        textNode.y = y;
        textNode.name = name || text;
        const requestedStyle = fontStyle || getFontStyle2(fontWeight);
        const resolvedFont = (_b = ctx.resolvedFontMap.get(`${fontFamily}::${requestedStyle}`)) != null ? _b : { family: fontFamily, style: requestedStyle };
        textNode.fontName = resolvedFont;
        textNode.fontSize = parseInt(String(fontSize));
        if (p.lineHeight !== void 0) {
          if (typeof p.lineHeight === "number") textNode.lineHeight = { value: p.lineHeight, unit: "PIXELS" };
          else if (p.lineHeight.unit === "AUTO") textNode.lineHeight = { unit: "AUTO" };
          else textNode.lineHeight = { value: p.lineHeight.value, unit: p.lineHeight.unit };
        }
        if (p.letterSpacing !== void 0) {
          if (typeof p.letterSpacing === "number") textNode.letterSpacing = { value: p.letterSpacing, unit: "PIXELS" };
          else textNode.letterSpacing = { value: p.letterSpacing.value, unit: p.letterSpacing.unit };
        }
        if (p.textCase) textNode.textCase = p.textCase;
        if (p.textDecoration) textNode.textDecoration = p.textDecoration;
        yield ctx.setCharacters(textNode, text);
        if (textAlignHorizontal) textNode.textAlignHorizontal = textAlignHorizontal;
        if (textAlignVertical) textNode.textAlignVertical = textAlignVertical;
        const hints = [];
        if (p.lineHeight !== void 0 && typeof p.lineHeight === "number" && p.lineHeight < 10) {
          hints.push({ type: "warn", message: `lineHeight ${p.lineHeight}px looks wrong \u2014 did you mean {value: ${Math.round(p.lineHeight * 100)}, unit: "PERCENT"}? Bare numbers are pixels.` });
        }
        if (p.lineHeight !== void 0 && typeof p.lineHeight === "object" && p.lineHeight.unit === "PERCENT" && p.lineHeight.value < 10) {
          hints.push({ type: "warn", message: `lineHeight ${p.lineHeight.value}% looks wrong \u2014 did you mean ${Math.round(p.lineHeight.value * 100)}%? PERCENT uses whole percentages (e.g. 150 = 1.5\xD7).` });
        }
        const colorSet = yield applyFillWithAutoBind(textNode, { fills }, hints);
        if (!colorSet && fills === void 0) {
          textNode.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }];
        }
        let resolvedStyleId = textStyleId;
        if (!resolvedStyleId && textStyleName) {
          const resolved = ctx.textStyleByName.get(textStyleName);
          if (resolved == null ? void 0 : resolved.id) resolvedStyleId = resolved.id;
        }
        if (resolvedStyleId) {
          const cached = ctx.resolvedTextStyleMap.get(resolvedStyleId);
          if (cached) {
            try {
              yield textNode.setTextStyleIdAsync(cached.id);
            } catch (e) {
              hints.push({ type: "error", message: `textStyleName '${textStyleName || resolvedStyleId}' matched but failed to apply: ${e.message}` });
            }
          } else {
            hints.push({ type: "error", message: `textStyleName '${textStyleName || resolvedStyleId}' matched style ID '${resolvedStyleId}' but the style could not be loaded. It may be from a remote library or deleted.` });
          }
        } else if (textStyleName) {
          hints.push(styleNotFoundHint("textStyleName", textStyleName, (ctx.textStyles || []).map((s) => s.name)));
        } else {
          hints.push(yield suggestTextStyle(fontSize, fontWeight));
        }
        const parent = yield appendToParent(textNode, parentId);
        checkOverlappingSiblings(textNode, parent, hints);
        checkParentOverflow(parent, hints);
        const comp = yield findComponentForBinding(textNode, componentId, hints);
        if (componentPropertyName) {
          if (!comp) {
            if (!componentId) hints.push({ type: "error", message: `componentPropertyName '${componentPropertyName}' ignored \u2014 no ancestor component found.` });
          } else {
            bindTextToComponentProperty(textNode, comp, componentPropertyName, hints);
          }
        } else if (comp) {
          const defOwner = comp.type === "COMPONENT" && ((_c = comp.parent) == null ? void 0 : _c.type) === "COMPONENT_SET" ? comp.parent : comp;
          const defs = defOwner.componentPropertyDefinitions;
          const textProps = Object.keys(defs).filter((k) => defs[k].type === "TEXT");
          if (textProps.length > 0) {
            const nodeName = textNode.name.toLowerCase();
            const match = textProps.find((k) => {
              const baseName = k.split("#")[0].toLowerCase();
              return baseName === nodeName;
            });
            if (match) {
              textNode.componentPropertyReferences = { characters: match };
            } else {
              const available = textProps.map((k) => k.split("#")[0]);
              hints.push({ type: "warn", message: `Text "${textNode.name}" added to component "${comp.name}" but not bound to any TEXT property. Pass componentPropertyName on text.create or text/frames(method:"update") to bind, or rename to match an existing property: [${available.join(", ")}].` });
            }
          } else {
            hints.push({ type: "warn", message: `Text "${textNode.name}" inside component "${comp.name}" is not exposed as a property \u2014 instances cannot override this text. Pass componentPropertyName to bind it.` });
          }
        }
        if (fontSize < 12) {
          hints.push({ type: "suggest", message: "WCAG: Min 12px text recommended." });
        }
        if (width !== void 0) {
          textNode.resize(width, textNode.height);
        }
        applySizing(textNode, parent, {
          layoutSizingHorizontal: layoutSizingHorizontal || (width !== void 0 ? "FIXED" : void 0),
          layoutSizingVertical
        }, hints);
        if (textAutoResize) {
          textNode.textAutoResize = textAutoResize;
        } else {
          const resolvedH = textNode.layoutSizingHorizontal;
          if (resolvedH === "FILL" || resolvedH === "FIXED") {
            textNode.textAutoResize = "HEIGHT";
          }
        }
        warnCrossAxisHug(textNode, textNode.parent, hints, "Text");
        applyAnnotations(textNode, p, hints);
        const result = { id: textNode.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        textNode.remove();
        throw e;
      }
    });
  }
  function createTextBatch(params) {
    return __async(this, null, function* () {
      const ctx = yield prepCreateText(params);
      return batchHandler(params, (item) => createTextSingle(item, ctx), { keys: TEXT_CREATE_KEYS, help: 'text(method: "help", topic: "create")' });
    });
  }
  var figmaHandlers9 = {
    create_text: createTextBatch
  };

  // src/handlers/fill-stroke.ts
  function setFillSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("fills" in node)) throw new Error(`Node does not support fills: ${p.nodeId}`);
      if (p.clear) {
        node.fills = [];
        return {};
      }
      const hints = [];
      let fills = p.fills;
      if (fills === void 0) {
        if (p.variableName) fills = { _variable: p.variableName };
        else if (p.variableId) fills = { _variableId: p.variableId };
        else if (p.styleName) fills = { _style: p.styleName };
        else if (p.color !== void 0) {
          const c = coerceColor(p.color);
          fills = c ? [solidPaint(c)] : p.color;
        }
      }
      yield applyFillWithAutoBind(node, { fills }, hints);
      const result = {};
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function setStrokeSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("strokes" in node)) throw new Error(`Node does not support strokes: ${p.nodeId}`);
      const hints = [];
      let strokes = p.strokes;
      if (strokes === void 0) {
        if (p.variableName) strokes = { _variable: p.variableName };
        else if (p.variableId) strokes = { _variableId: p.variableId };
        else if (p.styleName) strokes = { _style: p.styleName };
        else if (p.color !== void 0) {
          const c = coerceColor(p.color);
          strokes = c ? [solidPaint(c)] : p.color;
        }
      }
      yield applyStrokeWithAutoBind(node, {
        strokes,
        strokeWeight: p.strokeWeight,
        strokeTopWeight: p.strokeTopWeight,
        strokeBottomWeight: p.strokeBottomWeight,
        strokeLeftWeight: p.strokeLeftWeight,
        strokeRightWeight: p.strokeRightWeight
      }, hints);
      if (p.strokeAlign && "strokeAlign" in node) node.strokeAlign = p.strokeAlign;
      if (p.strokesIncludedInLayout !== void 0 && "strokesIncludedInLayout" in node) node.strokesIncludedInLayout = p.strokesIncludedInLayout;
      const result = {};
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function setCornerSingle(p) {
    return __async(this, null, function* () {
      var _a;
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("cornerRadius" in node)) throw new Error(`Node does not support corner radius: ${p.nodeId}`);
      const hints = [];
      const mapping = [
        ["topLeft", "topLeftRadius"],
        ["topRight", "topRightRadius"],
        ["bottomRight", "bottomRightRadius"],
        ["bottomLeft", "bottomLeftRadius"]
      ];
      const hasPer = mapping.some(([key]) => p[key] !== void 0);
      if (hasPer && "topLeftRadius" in node) {
        const cornerFields = {};
        for (const [key, field] of mapping) {
          cornerFields[field] = (_a = p[key]) != null ? _a : p.radius;
        }
        yield applyTokens(node, cornerFields, hints);
      } else if (p.radius !== void 0) {
        if ("topLeftRadius" in node) {
          const cornerFields = {};
          for (const [, field] of mapping) cornerFields[field] = p.radius;
          yield applyTokens(node, cornerFields, hints);
        } else {
          const bound = yield applyToken(node, "cornerRadius", p.radius, hints);
          if (!bound && p.radius !== 0) {
            hints.push({ type: "suggest", message: `Hardcoded cornerRadius. Use an existing FLOAT variable or create one with variables(method:"create"), then pass the variable name string instead of a number.` });
          }
        }
      }
      const result = {};
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function setOpacitySingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("opacity" in node)) throw new Error(`Node does not support opacity`);
      const hints = [];
      yield applyTokens(node, { opacity: p.opacity }, hints);
      const result = {};
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  var figmaHandlers10 = {
    set_fill_color: (p) => batchHandler(p, setFillSingle),
    set_stroke_color: (p) => batchHandler(p, setStrokeSingle),
    set_corner_radius: (p) => batchHandler(p, setCornerSingle),
    set_opacity: (p) => batchHandler(p, setOpacitySingle)
  };

  // src/handlers/effects.ts
  function setEffectsSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("effects" in node)) throw new Error(`Node does not support effects: ${p.nodeId}`);
      const result = {};
      if (p.effectStyleName) {
        const styles = yield figma.getLocalEffectStylesAsync();
        const exact = styles.find((s) => s.name === p.effectStyleName);
        const match = exact || styles.find((s) => s.name.toLowerCase().includes(p.effectStyleName.toLowerCase()));
        if (match) {
          yield node.setEffectStyleIdAsync(match.id);
          result.matchedStyle = match.name;
        } else if (p._effectStyleKey) {
          try {
            const style = yield figma.importStyleByKeyAsync(p._effectStyleKey);
            yield node.setEffectStyleIdAsync(style.id);
            result.matchedStyle = style.name;
          } catch (e) {
            throw new Error(`effectStyleName '${p.effectStyleName}' (library import) failed: ${e.message}. Ensure the source library is enabled for this file.`);
          }
        } else {
          const available = styles.map((s) => s.name);
          const names = available.slice(0, 20);
          const suffix = available.length > 20 ? `, \u2026 and ${available.length - 20} more` : "";
          throw new Error(`effectStyleName '${p.effectStyleName}' not found. Available: [${names.join(", ")}${suffix}]`);
        }
        if (p.effects) result.hints = [{ type: "warn", message: "Both effectStyleName and effects provided \u2014 used effectStyleName, ignored effects. Pass only one." }];
      } else if (p.effects) {
        const mapped = p.effects.map((e) => {
          var _a, _b, _c;
          const eff = { type: e.type, radius: e.radius, visible: (_a = e.visible) != null ? _a : true };
          if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") eff.blendMode = e.blendMode || "NORMAL";
          if (e.color) {
            const c = coerceColor(e.color);
            if (c) eff.color = c;
          }
          if (e.offset) eff.offset = { x: (_b = e.offset.x) != null ? _b : 0, y: (_c = e.offset.y) != null ? _c : 0 };
          if (e.spread !== void 0) eff.spread = e.spread;
          return eff;
        });
        node.effects = mapped;
      }
      return result;
    });
  }
  function setConstraintsSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("constraints" in node)) throw new Error(`Node does not support constraints: ${p.nodeId}`);
      node.constraints = { horizontal: p.horizontal, vertical: p.vertical };
      return {};
    });
  }
  function setExportSettingsSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("exportSettings" in node)) throw new Error(`Node does not support exportSettings: ${p.nodeId}`);
      node.exportSettings = p.settings;
      return {};
    });
  }
  function setNodePropertiesSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      for (const [key, value] of Object.entries(p.properties)) {
        if (key in node) node[key] = value;
      }
      return {};
    });
  }
  var figmaHandlers11 = {
    set_effects: (p) => batchHandler(p, setEffectsSingle),
    set_constraints: (p) => batchHandler(p, setConstraintsSingle),
    set_export_settings: (p) => batchHandler(p, setExportSettingsSingle),
    set_node_properties: (p) => batchHandler(p, setNodePropertiesSingle)
  };

  // src/handlers/modify-node.ts
  function moveSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("x" in node)) throw new Error(`Node does not support position: ${p.nodeId}`);
      node.x = p.x;
      node.y = p.y;
      return {};
    });
  }
  function resizeSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      const savedH = "layoutSizingHorizontal" in node ? node.layoutSizingHorizontal : void 0;
      const savedV = "layoutSizingVertical" in node ? node.layoutSizingVertical : void 0;
      if ("resize" in node) node.resize(p.width, p.height);
      else if ("resizeWithoutConstraints" in node) node.resizeWithoutConstraints(p.width, p.height);
      else throw new Error(`Node does not support resize: ${p.nodeId}`);
      if (savedH === "HUG") node.layoutSizingHorizontal = "HUG";
      if (savedV === "HUG") node.layoutSizingVertical = "HUG";
      return {};
    });
  }
  function deleteSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      node.remove();
      return {};
    });
  }
  function cloneSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      const clone = node.clone();
      if (p.name) clone.name = p.name;
      if (p.x !== void 0 && "x" in clone) {
        clone.x = p.x;
        clone.y = p.y;
      }
      if (p.parentId) {
        const parent = yield figma.getNodeByIdAsync(p.parentId);
        if (!parent || !("appendChild" in parent)) throw new Error(`Invalid parent: ${p.parentId}`);
        if (parent.type === "PAGE") {
          yield parent.loadAsync();
        } else {
          let targetPage = parent;
          while (targetPage && targetPage.type !== "PAGE") targetPage = targetPage.parent;
          if ((targetPage == null ? void 0 : targetPage.type) === "PAGE") yield targetPage.loadAsync();
        }
        if (parent.type === "COMPONENT_SET" && clone.type === "COMPONENT") {
          const siblings = parent.children || [];
          const duplicate = siblings.find((c) => c.type === "COMPONENT" && c.name === clone.name);
          if (duplicate) {
            clone.remove();
            throw new Error(`Variant "${clone.name}" already exists in "${parent.name}". Pass name to rename the clone before appending. Example: components(method:"clone", id:"${node.id}", name:"State=Hover", parentId:"${p.parentId}")`);
          }
        }
        try {
          parent.appendChild(clone);
        } catch (e) {
          clone.remove();
          const isComponent = node.type === "COMPONENT" || node.type === "COMPONENT_SET";
          const parentIsComponent = parent.type === "COMPONENT" || parent.type === "COMPONENT_SET";
          if (isComponent && parentIsComponent) {
            throw new Error(`Cannot nest component "${node.name}" inside component "${parent.name}". Use instances(method: "create", items: [{componentId: "${node.id}", parentId: "${p.parentId}"}]) to create an instance instead.`);
          }
          throw new Error(`Cannot append "${node.name}" to "${parent.name}": ${e.message}`);
        }
        if (parent.type === "COMPONENT_SET" && clone.type === "COMPONENT") {
          const copyRefs = (src, dst) => {
            if (src.componentPropertyReferences) {
              dst.componentPropertyReferences = __spreadValues({}, src.componentPropertyReferences);
            }
            if ("children" in src && "children" in dst) {
              const srcKids = src.children;
              const dstKids = dst.children;
              for (let i = 0; i < Math.min(srcKids.length, dstKids.length); i++) {
                copyRefs(srcKids[i], dstKids[i]);
              }
            }
          };
          copyRefs(node, clone);
        }
      } else {
        figma.currentPage.appendChild(clone);
      }
      return { id: clone.id };
    });
  }
  function insertSingle(p) {
    return __async(this, null, function* () {
      const parent = yield figma.getNodeByIdAsync(p.parentId);
      if (!parent) throw new Error(`Parent not found: ${p.parentId}`);
      if (!("insertChild" in parent)) throw new Error(`Parent does not support children: ${p.parentId}. Only FRAME, COMPONENT, GROUP, SECTION, SLOT, and PAGE nodes can have children.`);
      const child = yield figma.getNodeByIdAsync(p.childId);
      if (!child) throw new Error(`Child not found: ${p.childId}`);
      if (p.index !== void 0) parent.insertChild(p.index, child);
      else parent.appendChild(child);
      return {};
    });
  }
  var figmaHandlers12 = {
    move_node: (p) => batchHandler(p, moveSingle),
    resize_node: (p) => batchHandler(p, resizeSingle),
    delete_node: (p) => batchHandler(p, deleteSingle),
    // Legacy alias
    delete_multiple_nodes: (p) => __async(null, null, function* () {
      return batchHandler({ items: (p.nodeIds || []).map((id) => ({ nodeId: id })) }, deleteSingle);
    }),
    clone_node: (p) => batchHandler(p, cloneSingle),
    insert_child: (p) => batchHandler(p, insertSingle)
  };

  // src/handlers/update-frame.ts
  var LAYOUT_TYPES = ["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SLOT"];
  function updateFrameSingle(p) {
    return __async(this, null, function* () {
      var _a;
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      const hints = [];
      const isLayoutType = LAYOUT_TYPES.includes(node.type);
      const settingLayoutMode = p.layoutMode !== void 0;
      let hasAutoLayout = settingLayoutMode ? p.layoutMode !== "NONE" : isLayoutType && node.layoutMode !== "NONE";
      const needsAutoLayout = !hasAutoLayout && isLayoutType && (p.paddingTop !== void 0 || p.paddingRight !== void 0 || p.paddingBottom !== void 0 || p.paddingLeft !== void 0 || p.primaryAxisAlignItems !== void 0 || p.counterAxisAlignItems !== void 0 || p.itemSpacing !== void 0 || p.counterAxisSpacing !== void 0 || p.layoutWrap !== void 0);
      if (needsAutoLayout) {
        node.layoutMode = "HORIZONTAL";
        hasAutoLayout = true;
        hints.push({ type: "confirm", message: "Enabled auto-layout (HORIZONTAL) because layout properties (padding/spacing/alignment) require it." });
      }
      if (!isLayoutType) {
        const layoutProps = [
          settingLayoutMode && "layoutMode",
          p.layoutWrap !== void 0 && "layoutWrap",
          (p.paddingTop !== void 0 || p.paddingRight !== void 0 || p.paddingBottom !== void 0 || p.paddingLeft !== void 0) && "padding",
          (p.primaryAxisAlignItems !== void 0 || p.counterAxisAlignItems !== void 0) && "alignment",
          p.itemSpacing !== void 0 && "itemSpacing",
          p.counterAxisSpacing !== void 0 && "counterAxisSpacing",
          (p.layoutSizingHorizontal !== void 0 || p.layoutSizingVertical !== void 0) && "sizing"
        ].filter(Boolean);
        if (layoutProps.length > 0) {
          hints.push({ type: "warn", message: `Node type ${node.type} does not support layout properties (${layoutProps.join(", ")}) \u2014 ignored. These only work on FRAME, COMPONENT, COMPONENT_SET, INSTANCE, and SLOT.` });
          const result2 = {};
          if (hints.length > 0) result2.hints = hints;
          return result2;
        }
      }
      if (p.layoutWrap === "WRAP") {
        const effectiveMode = (_a = p.layoutMode) != null ? _a : node.layoutMode;
        if (effectiveMode === "VERTICAL") {
          throw new Error("layoutWrap 'WRAP' requires layoutMode 'HORIZONTAL' \u2014 Figma does not support wrap on vertical layouts. Use column frames inside a horizontal parent for vertical grid patterns.");
        }
      }
      if (settingLayoutMode) {
        node.layoutMode = p.layoutMode;
        if (p.layoutMode !== "NONE" && p.layoutWrap) node.layoutWrap = p.layoutWrap;
      } else if (p.layoutWrap !== void 0) {
        node.layoutWrap = p.layoutWrap;
      }
      const hasPadding = p.paddingTop !== void 0 || p.paddingRight !== void 0 || p.paddingBottom !== void 0 || p.paddingLeft !== void 0;
      if (hasPadding) {
        yield applyTokens(node, {
          paddingTop: p.paddingTop,
          paddingRight: p.paddingRight,
          paddingBottom: p.paddingBottom,
          paddingLeft: p.paddingLeft
        }, hints);
      }
      if (p.primaryAxisAlignItems !== void 0) node.primaryAxisAlignItems = p.primaryAxisAlignItems;
      if (p.counterAxisAlignItems !== void 0) node.counterAxisAlignItems = p.counterAxisAlignItems;
      if (p.layoutSizingHorizontal !== void 0 || p.layoutSizingVertical !== void 0) {
        applySizing(node, node.parent, p, hints, false);
      }
      if (p.itemSpacing !== void 0) {
        yield applyTokens(node, { itemSpacing: p.itemSpacing }, hints);
      }
      if (p.counterAxisSpacing !== void 0) {
        const wrap = p.layoutWrap || node.layoutWrap;
        if (wrap !== "WRAP") {
          node.layoutWrap = "WRAP";
          hints.push({ type: "confirm", message: "Enabled layoutWrap='WRAP' because counterAxisSpacing requires it." });
        }
        yield applyTokens(node, { counterAxisSpacing: p.counterAxisSpacing }, hints);
      }
      const result = {};
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  var figmaHandlers13 = {
    update_frame: (p) => batchHandler(p, updateFrameSingle)
  };

  // src/handlers/text.ts
  function getFontStyle3(weight) {
    const map = {
      100: "Thin",
      200: "Extra Light",
      300: "Light",
      400: "Regular",
      500: "Medium",
      600: "Semi Bold",
      700: "Bold",
      800: "Extra Bold",
      900: "Black"
    };
    return map[weight] || "Regular";
  }
  function prepSetTextContent(params) {
    return __async(this, null, function* () {
      const items = params.items || [params];
      const nodeMap = /* @__PURE__ */ new Map();
      const fontsToLoad = /* @__PURE__ */ new Map();
      fontsToLoad.set("Inter::Regular", { family: "Inter", style: "Regular" });
      for (const p of items) {
        const node = yield figma.getNodeByIdAsync(p.nodeId);
        if ((node == null ? void 0 : node.type) === "TEXT") {
          nodeMap.set(p.nodeId, node);
          const fn = node.fontName;
          if (fn !== figma.mixed && fn) {
            fontsToLoad.set(`${fn.family}::${fn.style}`, fn);
          }
        }
      }
      yield Promise.all([...fontsToLoad.values()].map((f) => figma.loadFontAsync(f)));
      const { setCharacters: setCharacters2 } = yield Promise.resolve().then(() => (init_figma_helpers(), figma_helpers_exports));
      return { nodeMap, setCharacters: setCharacters2 };
    });
  }
  function setTextContentSingle(p, ctx) {
    return __async(this, null, function* () {
      const node = ctx.nodeMap.get(p.nodeId);
      if (!node) {
        const raw = yield figma.getNodeByIdAsync(p.nodeId);
        if (!raw) throw new Error(`Node not found: ${p.nodeId}`);
        throw new Error(`Node is not a text node: ${p.nodeId}`);
      }
      yield ctx.setCharacters(node, p.text);
      return {};
    });
  }
  function setTextContentBatch(params) {
    return __async(this, null, function* () {
      const ctx = yield prepSetTextContent(params);
      return batchHandler(params, (item) => setTextContentSingle(item, ctx));
    });
  }
  function prepSetTextProperties(params) {
    return __async(this, null, function* () {
      const items = params.items || [params];
      const nodeMap = /* @__PURE__ */ new Map();
      const fontsToLoad = /* @__PURE__ */ new Map();
      for (const p of items) {
        const node = yield figma.getNodeByIdAsync(p.nodeId);
        if ((node == null ? void 0 : node.type) === "TEXT") {
          const tn = node;
          nodeMap.set(p.nodeId, tn);
          const fn = tn.fontName;
          if (fn !== figma.mixed && fn) {
            fontsToLoad.set(`${fn.family}::${fn.style}`, fn);
          }
          if (p.fontWeight !== void 0) {
            const style = getFontStyle3(p.fontWeight);
            const family = fn !== figma.mixed && fn ? fn.family : "Inter";
            fontsToLoad.set(`${family}::${style}`, { family, style });
          }
        }
      }
      const { byName: textStyleByName, fontsToLoad: styleFonts, localStyles } = yield resolveTextStylesForBatch(items);
      for (const fn of styleFonts) {
        fontsToLoad.set(`${fn.family}::${fn.style}`, fn);
      }
      yield Promise.allSettled(
        [...fontsToLoad.values()].map(
          (f) => Promise.race([
            figma.loadFontAsync(f),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Font load timeout: ${f.family} ${f.style}`)), 3e3))
          ])
        )
      );
      const textStyles = items.some((p) => p.textStyleName) ? localStyles : null;
      return { nodeMap, textStyles, textStyleByName };
    });
  }
  function setTextPropertiesSingle(p, ctx) {
    return __async(this, null, function* () {
      var _a, _b;
      const node = ctx.nodeMap.get(p.nodeId);
      if (!node) {
        const raw = yield figma.getNodeByIdAsync(p.nodeId);
        if (!raw) throw new Error(`Node not found: ${p.nodeId}`);
        throw new Error(`Not a text node: ${p.nodeId}`);
      }
      const warnings = [];
      let resolvedStyleId = p.textStyleId;
      if (!resolvedStyleId && p.textStyleName) {
        const resolved = ctx.textStyleByName.get(p.textStyleName);
        if (resolved == null ? void 0 : resolved.id) resolvedStyleId = resolved.id;
      }
      if (resolvedStyleId) {
        const s = yield figma.getStyleByIdAsync(resolvedStyleId);
        if ((s == null ? void 0 : s.type) === "TEXT") yield node.setTextStyleIdAsync(s.id);
      } else if (p.textStyleName) {
        warnings.push(styleNotFoundHint("textStyleName", p.textStyleName, (ctx.textStyles || []).map((s) => s.name)));
      } else {
        if (p.fontWeight !== void 0) {
          const family = node.fontName !== figma.mixed && node.fontName ? node.fontName.family : "Inter";
          node.fontName = { family, style: getFontStyle3(p.fontWeight) };
        }
        if (p.fontSize !== void 0) node.fontSize = p.fontSize;
      }
      if (p.lineHeight !== void 0) {
        if (typeof p.lineHeight === "number") node.lineHeight = { value: p.lineHeight, unit: "PIXELS" };
        else if (p.lineHeight.unit === "AUTO") node.lineHeight = { unit: "AUTO" };
        else node.lineHeight = { value: p.lineHeight.value, unit: p.lineHeight.unit };
      }
      if (p.letterSpacing !== void 0) {
        if (typeof p.letterSpacing === "number") node.letterSpacing = { value: p.letterSpacing, unit: "PIXELS" };
        else node.letterSpacing = { value: p.letterSpacing.value, unit: p.letterSpacing.unit };
      }
      if (p.textCase) node.textCase = p.textCase;
      if (p.textDecoration) node.textDecoration = p.textDecoration;
      if (p.lineHeight !== void 0 && typeof p.lineHeight === "number" && p.lineHeight < 10) {
        warnings.push({ type: "warn", message: `lineHeight ${p.lineHeight}px looks wrong \u2014 did you mean {value: ${Math.round(p.lineHeight * 100)}, unit: "PERCENT"}? Bare numbers are pixels.` });
      }
      if (p.lineHeight !== void 0 && typeof p.lineHeight === "object" && p.lineHeight.unit === "PERCENT" && p.lineHeight.value < 10) {
        warnings.push({ type: "warn", message: `lineHeight ${p.lineHeight.value}% looks wrong \u2014 did you mean ${Math.round(p.lineHeight.value * 100)}%? PERCENT uses whole percentages (e.g. 150 = 1.5\xD7).` });
      }
      if (p.fills !== void 0) {
        yield applyFillWithAutoBind(node, { fills: p.fills }, warnings);
      }
      if (p.textAlignHorizontal) node.textAlignHorizontal = p.textAlignHorizontal;
      if (p.textAlignVertical) node.textAlignVertical = p.textAlignVertical;
      if (p.textAutoResize) node.textAutoResize = p.textAutoResize;
      if (p.layoutSizingHorizontal || p.layoutSizingVertical) {
        applySizing(node, node.parent, p, warnings, false);
      }
      if ((p.layoutSizingHorizontal || p.layoutSizingVertical) && node.layoutSizingHorizontal === "HUG" && node.layoutSizingVertical === "HUG") {
        const parentIsAL = node.parent && "layoutMode" in node.parent && node.parent.layoutMode !== "NONE";
        if (parentIsAL && !isSmallIntrinsic(node.parent)) {
          warnings.push({ type: "warn", message: `Text with HUG on both axes won't wrap. Use layoutSizingHorizontal:"FILL" + layoutSizingVertical:"HUG" so text fills parent width and wraps, or set textAutoResize:"HEIGHT" for fixed-width wrapping.` });
        }
      }
      if (p.layoutSizingHorizontal || p.layoutSizingVertical) {
        warnCrossAxisHug(node, node.parent, warnings, "Text");
      }
      if (p.textStyleName && p.textStyleId) {
        warnings.push({ type: "warn", message: "Both textStyleName and textStyleId provided \u2014 used textStyleId. Pass only one." });
      }
      if (!resolvedStyleId && !p.textStyleName && !p.textStyleId && (p.fontSize !== void 0 || p.fontWeight !== void 0)) {
        const fs = (_a = p.fontSize) != null ? _a : typeof node.fontSize === "number" ? node.fontSize : 14;
        const fw = (_b = p.fontWeight) != null ? _b : 400;
        warnings.push(yield suggestTextStyle(fs, fw));
      }
      const result = {};
      if (warnings.length > 0) result.hints = warnings;
      return result;
    });
  }
  function setTextPropertiesBatch(params) {
    return __async(this, null, function* () {
      const ctx = yield prepSetTextProperties(params);
      return batchHandler(params, (item) => setTextPropertiesSingle(item, ctx));
    });
  }
  function scanTextSingle(p) {
    return __async(this, null, function* () {
      var _a;
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      const limit = (_a = p.limit) != null ? _a : 50;
      const opts = { includePath: p.includePath !== false, includeGeometry: p.includeGeometry !== false };
      const textNodes = [];
      yield collectTextNodes(node, [], [], 0, textNodes, limit, opts);
      const truncated = textNodes.length >= limit;
      return { nodeId: p.nodeId, count: textNodes.length, truncated, textNodes };
    });
  }
  function collectTextNodes(node, namePath, idPath, depth, out, limit, opts) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      if (out.length >= limit) return;
      if (node.visible === false) return;
      const names = [...namePath, node.name || `Unnamed ${node.type}`];
      const ids = [...idPath, node.id];
      if (node.type === "TEXT") {
        let fontFamily = "", fontStyle = "";
        if (node.fontName && typeof node.fontName === "object") {
          if ("family" in node.fontName) fontFamily = node.fontName.family;
          if ("style" in node.fontName) fontStyle = node.fontName.style;
        }
        const entry = {
          id: node.id,
          name: node.name || "Text",
          characters: node.characters,
          fontSize: typeof node.fontSize === "number" ? node.fontSize : 0,
          fontFamily,
          fontStyle
        };
        if (opts.includeGeometry) {
          const bounds = (_a = node.absoluteBoundingBox) != null ? _a : node.absoluteRenderBounds;
          entry.absoluteX = bounds ? bounds.x : null;
          entry.absoluteY = bounds ? bounds.y : null;
          entry.width = bounds ? bounds.width : (_b = node.width) != null ? _b : 0;
          entry.height = bounds ? bounds.height : (_c = node.height) != null ? _c : 0;
        }
        if (opts.includePath) {
          entry.path = names.join(" > ");
          entry.pathIds = ids.join(" > ");
          entry.depth = depth;
        }
        out.push(entry);
      }
      if ("children" in node) {
        for (const child of node.children) {
          if (out.length >= limit) break;
          yield collectTextNodes(child, names, ids, depth + 1, out, limit, opts);
        }
      }
    });
  }
  function setMultipleTextContentsFigma(params) {
    return __async(this, null, function* () {
      const items = params.text || params.items || [];
      return setTextContentBatch({ items, depth: params.depth });
    });
  }
  var figmaHandlers14 = {
    set_text_content: setTextContentBatch,
    set_text_properties: setTextPropertiesBatch,
    scan_text_nodes: (p) => batchHandler(p, scanTextSingle),
    // Legacy alias
    set_multiple_text_contents: setMultipleTextContentsFigma
  };

  // src/handlers/patch-nodes.ts
  var SIMPLE_PROPS = ["name", "visible", "locked", "rotation", "blendMode", "layoutPositioning", "overflowDirection"];
  var FILL_KEYS = ["fills", "fillColor", "fillStyleName", "fillVariableName", "clearFill", "_imageData"];
  var STROKE_KEYS = [
    "strokes",
    "strokeColor",
    "strokeStyleName",
    "strokeVariableName",
    "strokeWeight",
    "strokeTopWeight",
    "strokeBottomWeight",
    "strokeLeftWeight",
    "strokeRightWeight"
  ];
  var CORNER_KEYS = [
    "cornerRadius",
    "topLeftRadius",
    "topRightRadius",
    "bottomRightRadius",
    "bottomLeftRadius"
  ];
  var EFFECT_KEYS = ["effects", "effectStyleName"];
  var LAYOUT_KEYS = [
    "layoutMode",
    "layoutWrap",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "primaryAxisAlignItems",
    "counterAxisAlignItems",
    "layoutSizingHorizontal",
    "layoutSizingVertical",
    "itemSpacing",
    "counterAxisSpacing"
  ];
  var LAYOUT_KEYS_NO_SIZING = LAYOUT_KEYS.filter(
    (k) => k !== "layoutSizingHorizontal" && k !== "layoutSizingVertical"
  );
  var TEXT_KEYS = [...mixinTextParams];
  var ALL_KNOWN = /* @__PURE__ */ new Set([
    ...nodeUpdate,
    "nodeId",
    // handler alias for id
    "componentProperties",
    // instance handler extension
    "componentPropertyName",
    // bind text node to component TEXT property
    "componentId",
    // explicit target component for property binding
    "_imageData",
    // base64 image data (injected by MCP pre-processor)
    "_imageMimeType",
    // image MIME type (injected by MCP pre-processor)
    "imageScaleMode"
    // IMAGE fill scale mode
  ]);
  function hasAny(item, keys) {
    return keys.some((k) => item[k] !== void 0);
  }
  function doResize(item) {
    return __async(this, null, function* () {
      let w = item.width;
      let h = item.height;
      if (w === void 0 || h === void 0) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (!node) throw new Error(`Node not found: ${item.nodeId}`);
        if ("width" in node && "height" in node) {
          w = w != null ? w : node.width;
          h = h != null ? h : node.height;
        } else {
          throw new Error(`Node does not support resize: ${item.nodeId}`);
        }
      }
      yield resizeSingle({ nodeId: item.nodeId, width: w, height: h });
    });
  }
  function patchSingleNode(item, textCtx) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const result = {};
      const hints = [];
      function collectHints(r) {
        if (r == null ? void 0 : r.hints) hints.push(...r.hints);
      }
      const simpleUpdates = SIMPLE_PROPS.filter((k) => item[k] !== void 0);
      const sizeConstraints = ["minWidth", "maxWidth", "minHeight", "maxHeight"].filter((k) => item[k] !== void 0);
      if (simpleUpdates.length > 0 || sizeConstraints.length > 0) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (!node) throw new Error(`Node not found: ${item.nodeId}`);
        for (const key of [...simpleUpdates, ...sizeConstraints]) {
          if (key in node) node[key] = item[key];
          else hints.push({ type: "error", message: `Property '${key}' not supported on ${node.type}` });
        }
      }
      if (item.x !== void 0 || item.y !== void 0) {
        yield moveSingle({ nodeId: item.nodeId, x: item.x, y: item.y });
      }
      if (item.padding !== void 0) {
        (_a = item.paddingTop) != null ? _a : item.paddingTop = item.padding;
        (_b = item.paddingRight) != null ? _b : item.paddingRight = item.padding;
        (_c = item.paddingBottom) != null ? _c : item.paddingBottom = item.padding;
        (_d = item.paddingLeft) != null ? _d : item.paddingLeft = item.padding;
      }
      const hasLayout = hasAny(item, LAYOUT_KEYS);
      const needsResize = item.width !== void 0 || item.height !== void 0;
      if (needsResize && !hasLayout) {
        yield doResize(item);
        if (item.width !== void 0 && !item.textAutoResize) {
          const node = yield figma.getNodeByIdAsync(item.nodeId);
          if ((node == null ? void 0 : node.type) === "TEXT") {
            node.textAutoResize = item.height !== void 0 ? "NONE" : "HEIGHT";
          }
        }
      }
      if (item._imageData) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (!node) throw new Error(`Node not found: ${item.nodeId}`);
        yield applyImageFill(node, item, hints);
      } else if (hasAny(item, FILL_KEYS)) {
        const r = yield setFillSingle({
          nodeId: item.nodeId,
          fills: item.fills,
          clear: item.clearFill
        });
        collectHints(r);
      }
      if (hasAny(item, STROKE_KEYS)) {
        const r = yield setStrokeSingle({
          nodeId: item.nodeId,
          strokes: item.strokes,
          strokeWeight: item.strokeWeight,
          strokeTopWeight: item.strokeTopWeight,
          strokeBottomWeight: item.strokeBottomWeight,
          strokeLeftWeight: item.strokeLeftWeight,
          strokeRightWeight: item.strokeRightWeight
        });
        collectHints(r);
      }
      if (hasAny(item, CORNER_KEYS)) {
        const r = yield setCornerSingle({
          nodeId: item.nodeId,
          radius: item.cornerRadius,
          topLeft: item.topLeftRadius,
          topRight: item.topRightRadius,
          bottomRight: item.bottomRightRadius,
          bottomLeft: item.bottomLeftRadius
        });
        collectHints(r);
      }
      if (item.opacity !== void 0) {
        const r = yield setOpacitySingle({ nodeId: item.nodeId, opacity: item.opacity });
        collectHints(r);
      }
      if (hasAny(item, EFFECT_KEYS)) {
        const r = yield setEffectsSingle({
          nodeId: item.nodeId,
          effects: item.effects,
          effectStyleName: item.effectStyleName
        });
        if (r.matchedStyle) result.matchedEffectStyle = r.matchedStyle;
        collectHints(r);
      }
      if (item.constraints) {
        yield setConstraintsSingle(__spreadValues({ nodeId: item.nodeId }, item.constraints));
      }
      if (item.exportSettings) {
        yield setExportSettingsSingle({ nodeId: item.nodeId, settings: item.exportSettings });
      }
      const isText = textCtx && textCtx.nodeMap.has(item.nodeId);
      const layoutH = isText ? void 0 : item.layoutSizingHorizontal;
      const layoutV = isText ? void 0 : item.layoutSizingVertical;
      const hasLayoutForDispatch = isText ? hasAny(item, LAYOUT_KEYS_NO_SIZING) : hasLayout;
      if (hasLayoutForDispatch) {
        const r = yield updateFrameSingle({
          nodeId: item.nodeId,
          layoutMode: item.layoutMode,
          layoutWrap: item.layoutWrap,
          paddingTop: item.paddingTop,
          paddingRight: item.paddingRight,
          paddingBottom: item.paddingBottom,
          paddingLeft: item.paddingLeft,
          primaryAxisAlignItems: item.primaryAxisAlignItems,
          counterAxisAlignItems: item.counterAxisAlignItems,
          layoutSizingHorizontal: layoutH,
          layoutSizingVertical: layoutV,
          itemSpacing: item.itemSpacing,
          counterAxisSpacing: item.counterAxisSpacing
        });
        collectHints(r);
      }
      if (needsResize && hasLayout) {
        yield doResize(item);
        if (item.width !== void 0 && !item.textAutoResize) {
          const node = yield figma.getNodeByIdAsync(item.nodeId);
          if ((node == null ? void 0 : node.type) === "TEXT") {
            node.textAutoResize = item.height !== void 0 ? "NONE" : "HEIGHT";
          }
        }
      }
      const hasTextOrSizing = hasAny(item, TEXT_KEYS) || item.layoutSizingHorizontal !== void 0 || item.layoutSizingVertical !== void 0;
      if (isText && hasTextOrSizing) {
        const r = yield setTextPropertiesSingle({
          nodeId: item.nodeId,
          fontSize: item.fontSize,
          fontFamily: item.fontFamily,
          fontStyle: item.fontStyle,
          fontWeight: item.fontWeight,
          fills: item.fills,
          textStyleId: item.textStyleId,
          textStyleName: item.textStyleName,
          textAlignHorizontal: item.textAlignHorizontal,
          textAlignVertical: item.textAlignVertical,
          textAutoResize: item.textAutoResize,
          // Sizing on TEXT nodes: handled here, not by updateFrameSingle (which rejects TEXT)
          layoutSizingHorizontal: item.layoutSizingHorizontal,
          layoutSizingVertical: item.layoutSizingVertical
        }, textCtx);
        collectHints(r);
      }
      if (item.componentPropertyName) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (!node) throw new Error(`Node not found: ${item.nodeId}`);
        if (node.type !== "TEXT") {
          hints.push({ type: "error", message: `componentPropertyName ignored \u2014 node is ${node.type}, not TEXT.` });
        } else {
          const comp = yield findComponentForBinding(node, item.componentId, hints);
          if (!comp) {
            if (!item.componentId) hints.push({ type: "error", message: `componentPropertyName '${item.componentPropertyName}' ignored \u2014 no ancestor component found.` });
          } else {
            bindTextToComponentProperty(node, comp, item.componentPropertyName, hints);
          }
        }
      }
      if (item.bindings) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (!node) throw new Error(`Node not found: ${item.nodeId}`);
        for (const b of item.bindings) {
          const variable = b.variableName ? yield findVariableByName(b.variableName) : yield findVariableById(b.variableId);
          if (!variable) {
            hints.push({ type: "error", message: `Variable not found: ${b.variableName || b.variableId}` });
            continue;
          }
          const paintMatch = b.field.match(/^(fills|strokes)\/(\d+)\/color$/);
          if (paintMatch) {
            const prop = paintMatch[1];
            const index = parseInt(paintMatch[2], 10);
            if (!(prop in node)) throw new Error(`Node does not have ${prop}`);
            const paints = node[prop].slice();
            while (index >= paints.length) {
              paints.push({ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 });
            }
            paints[index] = figma.variables.setBoundVariableForPaint(paints[index], "color", variable);
            node[prop] = paints;
          } else if ("setBoundVariable" in node) {
            node.setBoundVariable(b.field, variable);
          } else {
            hints.push({ type: "error", message: `Node does not support variable binding for field: ${b.field}` });
          }
        }
      }
      if (item.explicitMode) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (!node) throw new Error(`Node not found: ${item.nodeId}`);
        if (!("setExplicitVariableModeForCollection" in node)) {
          hints.push({ type: "error", message: `Node ${item.nodeId} does not support explicit variable modes.` });
        } else {
          const allCollections = yield figma.variables.getLocalVariableCollectionsAsync();
          const em = item.explicitMode;
          let collection;
          let modeId;
          if (em.collectionName) {
            const cName = em.collectionName.toLowerCase();
            collection = allCollections.find((c) => c.name.toLowerCase() === cName);
            if (!collection) throw new Error(`Collection not found: "${em.collectionName}". Available: ${allCollections.map((c) => c.name).join(", ")}`);
          } else {
            collection = allCollections.find((c) => c.id === em.collectionId);
            if (!collection) throw new Error(`Collection not found: ${em.collectionId}. Available: ${allCollections.map((c) => `${c.name} (${c.id})`).join(", ")}`);
          }
          if (em.modeName) {
            const mName = em.modeName.toLowerCase();
            const mode = collection.modes.find((m) => m.name.toLowerCase() === mName);
            if (!mode) throw new Error(`Mode not found: "${em.modeName}" in collection "${collection.name}". Available: ${collection.modes.map((m) => m.name).join(", ")}`);
            modeId = mode.modeId;
          } else {
            modeId = em.modeId;
            if (!modeId) throw new Error(`explicitMode requires either modeName or modeId`);
          }
          node.setExplicitVariableModeForCollection(collection, modeId);
        }
      }
      if (item.properties) {
        yield setNodePropertiesSingle({ nodeId: item.nodeId, properties: item.properties });
      }
      if (item.annotations) {
        const node = yield figma.getNodeByIdAsync(item.nodeId);
        if (node) applyAnnotations(node, item, hints);
      }
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function patchNodesBatch(params) {
    return __async(this, null, function* () {
      const items = params.items || [params];
      let textCtx = null;
      const SIZING_KEYS = ["layoutSizingHorizontal", "layoutSizingVertical"];
      const textItems = items.filter((item) => hasAny(item, TEXT_KEYS) || hasAny(item, SIZING_KEYS));
      if (textItems.length > 0) {
        const syntheticItems = textItems.map((item) => ({
          nodeId: item.nodeId,
          fontSize: item.fontSize,
          fontFamily: item.fontFamily,
          fontStyle: item.fontStyle,
          fontWeight: item.fontWeight,
          textStyleId: item.textStyleId,
          textStyleName: item.textStyleName,
          _textStyleKey: item._textStyleKey
        }));
        textCtx = yield prepSetTextProperties({ items: syntheticItems });
      }
      return batchHandler(params, (item) => patchSingleNode(item, textCtx), { keys: ALL_KNOWN, help: 'frames(method: "help", topic: "update")' });
    });
  }
  var figmaHandlers15 = {
    patch_nodes: patchNodesBatch
  };

  // src/handlers/components.ts
  function findTextNodes(node, skipInstances = false) {
    if (node.type === "TEXT") return [node];
    if (skipInstances && node.type === "INSTANCE") return [];
    if ("children" in node) {
      const result = [];
      for (const child of node.children) result.push(...findTextNodes(child, skipInstances));
      return result;
    }
    return [];
  }
  function warnUnboundText(comp, hints) {
    const textNodes = findTextNodes(comp, true).filter((t) => {
      var _a;
      return !((_a = t.componentPropertyReferences) == null ? void 0 : _a.characters);
    });
    if (textNodes.length > 0) {
      hints.push({ type: "suggest", message: `Component has ${textNodes.length} unbound text node${textNodes.length > 1 ? "s" : ""}. Fix: use components(method:"create", type:"from_node") with exposeText:true, or add properties with components(method:"update") then bind via text/frames(method:"update", items:[{id:"<textNodeId>", componentPropertyName:"<propName>"}]).` });
    }
  }
  function normalizeInlineChildTypes(children) {
    var _a;
    for (const child of children) {
      if (child.type) {
        child.type = child.type.toLowerCase();
      } else if (child.text !== void 0 || child.characters !== void 0) {
        child.type = "text";
      } else if (child.componentId || child.id) {
        child.type = "instance";
      } else if (child.name) {
        child.type = "frame";
      }
      if (child.type === "instance" && !child.componentId && child.id) {
        child.componentId = child.id;
        delete child.id;
      }
      if ((child.type === "frame" || child.type === "component") && ((_a = child.children) == null ? void 0 : _a.length)) {
        normalizeInlineChildTypes(child.children);
      }
    }
  }
  function collectTextChildren(children) {
    var _a;
    const result = [];
    for (const child of children) {
      if (child.type === "text") result.push(child);
      else if ((child.type === "frame" || child.type === "component") && ((_a = child.children) == null ? void 0 : _a.length)) {
        result.push(...collectTextChildren(child.children));
      }
    }
    return result;
  }
  function createInlineChildren(appendTo, comp, children, hints, textCtx) {
    return __async(this, null, function* () {
      var _a, _b, _d, _e, _f, _g;
      for (const child of children) {
        if (!child.type) {
          hints.push({ type: "error", message: `Inline child missing 'type'. Set type: "text", "frame", "instance", "component", or "slot".` });
          continue;
        }
        if (child.type === "text") {
          normalizeAliases(child, TEXT_ALIAS_KEYS);
          let resolvedTextKey;
          if (child.componentPropertyName && comp) {
            const text = (_b = (_a = child.text) != null ? _a : child.characters) != null ? _b : "Text";
            const keysBefore = new Set(Object.keys(comp.componentPropertyDefinitions));
            comp.addComponentProperty(child.componentPropertyName, "TEXT", text);
            const keysAfter = Object.keys(comp.componentPropertyDefinitions);
            resolvedTextKey = keysAfter.find((k) => !keysBefore.has(k));
          }
          const _c = child, { componentPropertyName: _ } = _c, textParams = __objRest(_c, ["componentPropertyName"]);
          const result = yield createTextSingle(__spreadProps(__spreadValues(__spreadProps(__spreadValues({}, textParams), {
            parentId: appendTo.id
          }), comp ? { componentId: comp.id } : {}), {
            name: child.name || child.componentPropertyName || child.text || child.characters || "Text"
          }), textCtx);
          if (resolvedTextKey && result.id) {
            const textNode = yield figma.getNodeByIdAsync(result.id);
            if (textNode) {
              textNode.componentPropertyReferences = __spreadProps(__spreadValues({}, textNode.componentPropertyReferences), { characters: resolvedTextKey });
            }
          }
          if (result.hints) hints.push(...result.hints);
        } else if (child.type === "frame") {
          child.parentId = appendTo.id;
          const frame = figma.createFrame();
          try {
            frame.name = child.name || "Frame";
            const { hints: frameHints } = yield setupFrameNode(frame, child);
            hints.push(...frameHints);
            if ((_d = child.children) == null ? void 0 : _d.length) {
              yield createInlineChildren(frame, comp, child.children, hints, textCtx);
            }
          } catch (e) {
            frame.remove();
            throw e;
          }
        } else if (child.type === "instance") {
          if (!child.componentId) {
            hints.push({ type: "error", message: "Inline instance child requires componentId." });
            continue;
          }
          const result = yield instanceCreateSingle(__spreadProps(__spreadValues({}, child), {
            parentId: appendTo.id
          }));
          if (child.componentPropertyName && comp && result.id) {
            const tempInst = yield figma.getNodeByIdAsync(result.id);
            const mainComp = tempInst && (yield tempInst.getMainComponentAsync());
            if (mainComp) {
              const keysBefore = new Set(Object.keys(comp.componentPropertyDefinitions));
              comp.addComponentProperty(child.componentPropertyName, "INSTANCE_SWAP", mainComp.id);
              const keysAfter = Object.keys(comp.componentPropertyDefinitions);
              const swapKey = keysAfter.find((k) => !keysBefore.has(k));
              if (swapKey) {
                const inst = yield figma.getNodeByIdAsync(result.id);
                if (inst) {
                  inst.componentPropertyReferences = __spreadProps(__spreadValues({}, inst.componentPropertyReferences), { mainComponent: swapKey });
                }
              }
            }
          }
          if (result.hints) hints.push(...result.hints);
        } else if (child.type === "component") {
          if (!child.name) {
            hints.push({ type: "error", message: "Inline component child requires name." });
            continue;
          }
          const result = yield createComponentSingle(__spreadProps(__spreadValues({}, child), {
            parentId: appendTo.id
          }));
          if (result.hints) hints.push(...result.hints);
        } else if (child.type === "slot") {
          if (!comp) {
            hints.push({ type: "error", message: `Inline slot children require a component parent. Slots can only be created inside components.` });
            continue;
          }
          const slot = comp.createSlot();
          if (child.name) slot.name = child.name;
          appendTo.appendChild(slot);
          (_e = child.layoutMode) != null ? _e : child.layoutMode = "VERTICAL";
          (_f = child.layoutSizingHorizontal) != null ? _f : child.layoutSizingHorizontal = "FILL";
          (_g = child.layoutSizingVertical) != null ? _g : child.layoutSizingVertical = "HUG";
          const _h = child, { type: _t, name: _n } = _h, slotFrameParams = __objRest(_h, ["type", "name"]);
          slotFrameParams.parentId = appendTo.id;
          slotFrameParams._skipOverlapCheck = true;
          const { hints: slotHints } = yield setupFrameNode(slot, slotFrameParams);
          hints.push(...slotHints);
        } else {
          hints.push({ type: "error", message: `Inline child type '${child.type}' not supported. Use 'text', 'frame', 'instance', 'component', or 'slot'.` });
        }
      }
    });
  }
  function createComponentSingle(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g;
      if (!p.name) throw new Error("Missing name");
      const hints = [];
      if ((_a = p.children) == null ? void 0 : _a.length) {
        const originalParams = p._originalParams;
        delete p._originalParams;
        normalizeInlineChildTypes(p.children);
        const validation = validateAndFixInlineChildren(p, hints);
        if (validation.hasAmbiguity) {
          const diff = formatDiff(validation.inferences);
          const correctedPayload = buildCorrectedPayload(p, originalParams);
          const canEdit = (_b = p._caps) == null ? void 0 : _b.edit;
          if (canEdit) {
            const stageFrame = yield createStageContainer(p, p.name);
            try {
              const stagedP = __spreadProps(__spreadValues({}, p), { parentId: stageFrame.id, x: void 0, y: void 0 });
              const comp2 = figma.createComponent();
              comp2.name = p.name;
              if (p.description) comp2.description = p.description;
              const { hints: setupHints } = yield setupFrameNode(comp2, stagedP);
              hints.push(...setupHints);
              if ((_c = p.children) == null ? void 0 : _c.length) {
                const textChildren = collectTextChildren(p.children);
                const textCtx = yield prepCreateText({ items: textChildren });
                yield createInlineChildren(comp2, comp2, p.children, hints, textCtx);
              }
              return { id: stageFrame.id, status: "staged", diff, correctedPayload, hints };
            } catch (e) {
              stageFrame.remove();
              throw e;
            }
          }
          return {
            error: `Ambiguous layout intent detected \u2014 review the diff and re-create with the corrected payload.`,
            diff,
            correctedPayload
          };
        }
      }
      const comp = figma.createComponent();
      try {
        comp.name = p.name;
        if (p.description) comp.description = p.description;
        const { hints: setupHints } = yield setupFrameNode(comp, p);
        hints.push(...setupHints);
        if ((_d = p.children) == null ? void 0 : _d.length) {
          const textChildren = collectTextChildren(p.children);
          const textCtx = yield prepCreateText({ items: textChildren });
          yield createInlineChildren(comp, comp, p.children, hints, textCtx);
        }
        if ((_e = p.properties) == null ? void 0 : _e.length) {
          for (const prop of p.properties) {
            if (prop.type === "TEXT") {
              const existing = resolveComponentPropertyKey(comp.componentPropertyDefinitions, prop.propertyName);
              if (existing) continue;
            }
            const options = prop.preferredValues ? { preferredValues: prop.preferredValues } : void 0;
            comp.addComponentProperty(prop.propertyName, prop.type, prop.defaultValue, options);
          }
          const textNodes = findTextNodes(comp, true);
          const defs = comp.componentPropertyDefinitions;
          for (const prop of p.properties) {
            if (prop.type !== "TEXT") continue;
            const key = resolveComponentPropertyKey(defs, prop.propertyName);
            if (!key) continue;
            const match = textNodes.find((t) => t.name.toLowerCase() === prop.propertyName.toLowerCase());
            if (match && !((_f = match.componentPropertyReferences) == null ? void 0 : _f.characters)) {
              match.componentPropertyReferences = { characters: key };
            }
          }
        }
        if (!((_g = p.children) == null ? void 0 : _g.length)) {
          warnUnboundText(comp, hints);
        }
        if (comp.layoutMode !== "NONE" && comp.layoutSizingHorizontal === "HUG" && comp.layoutSizingVertical === "HUG" && !isSmallIntrinsic(comp)) {
          const allText = findTextNodes(comp, true);
          if (allText.length > 0 && allText.some((t) => {
            var _a2, _b2;
            return ((_b2 = (_a2 = t.characters) == null ? void 0 : _a2.length) != null ? _b2 : 0) > 20;
          })) {
            hints.push({ type: "warn", message: `"${comp.name}" has text content but no width constraint \u2014 text won't wrap. Set a width and layoutSizingHorizontal:"FIXED".` });
          }
        }
        const result = { id: comp.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        comp.remove();
        throw e;
      }
    });
  }
  function deriveTextPropertyName(textNode, index, total, usedNames) {
    const layerName = textNode.name;
    const content = textNode.characters;
    let name;
    if (layerName !== content) {
      name = layerName;
    } else if (total <= 4) {
      const roles = ["title", "description", "detail", "caption"];
      name = roles[index] || `text_${index + 1}`;
    } else {
      const slug = content.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase().slice(0, 24);
      name = slug || `text_${index + 1}`;
    }
    const base = name;
    let counter = 2;
    while (usedNames.has(name)) {
      name = `${base}_${counter++}`;
    }
    usedNames.add(name);
    return name;
  }
  function fromNodeSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (node.type === "DOCUMENT" || node.type === "PAGE") throw new Error(`Cannot convert ${node.type} to a component.`);
      if (node.type === "COMPONENT") throw new Error(`Node "${node.name}" is already a COMPONENT.`);
      if (node.type === "COMPONENT_SET") throw new Error(`Node "${node.name}" is already a COMPONENT_SET. Use components(method: "get") to inspect it.`);
      if (node.type === "INSTANCE") throw new Error(`Node "${node.name}" is an INSTANCE. Detach it first with instances(method:"detach"), or use the source component directly.`);
      const comp = figma.createComponentFromNode(node);
      if (p.name) comp.name = p.name;
      const hints = [];
      const exposedProperties = {};
      if (p.exposeText !== false) {
        const textNodes = findTextNodes(comp, true);
        const sorted = [...textNodes].sort((a, b) => a.y - b.y || a.x - b.x);
        const usedNames = /* @__PURE__ */ new Set();
        for (let i = 0; i < sorted.length; i++) {
          const textNode = sorted[i];
          const propName = deriveTextPropertyName(textNode, i, sorted.length, usedNames);
          const defaultValue = textNode.characters;
          if (textNode.name === textNode.characters) {
            textNode.name = propName;
          }
          comp.addComponentProperty(propName, "TEXT", defaultValue);
          const defs = comp.componentPropertyDefinitions;
          const key = Object.keys(defs).find((k) => k === propName || k.startsWith(propName + "#"));
          if (key) {
            textNode.componentPropertyReferences = { characters: key };
            exposedProperties[key] = defaultValue;
          }
        }
      } else {
        warnUnboundText(comp, hints);
      }
      const result = { id: comp.id };
      if (Object.keys(exposedProperties).length > 0) result.exposedProperties = exposedProperties;
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function validateVariantChildren(children) {
    const invalid = children.filter((c) => c.type !== "component");
    if (invalid.length > 0) {
      const types = [...new Set(invalid.map((c) => c.type || "undefined"))].join(", ");
      throw new Error(`Variant set children must all be type:"component". Found: ${types}. Use components(method:"create", type:"component") for non-variant children.`);
    }
    const unnamed = children.filter((c) => !c.name);
    if (unnamed.length > 0) {
      throw new Error(`All variant components require a name.`);
    }
    function childShape(c) {
      const kids = c.children || [];
      const shape = kids.map((k) => {
        const type = k.type || "unknown";
        const name = k.name || k.componentPropertyName || type;
        return `${type}:${name}`;
      }).sort();
      return shape.join("|");
    }
    const shapes = children.map((c) => ({ name: c.name, shape: childShape(c) }));
    const firstShape = shapes[0].shape;
    const mismatched = shapes.filter((s) => s.shape !== firstShape);
    if (mismatched.length > 0) {
      throw new Error(
        `Variant components must have the same child structure. "${shapes[0].name}" has [${firstShape.replace(/\|/g, ", ")}] but "${mismatched[0].name}" has [${mismatched[0].shape.replace(/\|/g, ", ")}]. Ensure all variants define the same children with the same names. Tip: set explicit "name" on each child, or use "componentPropertyName" \u2014 text content alone is not used for matching.`
      );
    }
  }
  function combineSingle(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _e, _f;
      if (!p.componentIds && p.nodeIds) p.componentIds = p.nodeIds;
      if (((_a = p.children) == null ? void 0 : _a.length) && ((_b = p.componentIds) == null ? void 0 : _b.length)) {
        throw new Error("Cannot use both children and componentIds. Use children to define variants inline, or componentIds to combine existing components.");
      }
      if ((_c = p.children) == null ? void 0 : _c.length) {
        normalizeInlineChildTypes(p.children);
        validateVariantChildren(p.children);
        if (p.children.length < 2) throw new Error("Need at least 2 variant components in children.");
        const compIds = [];
        const hints2 = [];
        for (const child of p.children) {
          child._skipOverlapCheck = true;
          const result2 = yield createComponentSingle(child);
          if (!result2.id) throw new Error(`Failed to create variant component "${child.name}"`);
          compIds.push(result2.id);
          if (result2.hints) hints2.push(...result2.hints);
        }
        const _d = p, { children: _ } = _d, rest = __objRest(_d, ["children"]);
        return combineSingle(__spreadProps(__spreadValues({}, rest), { componentIds: compIds, _inlineHints: hints2 }));
      }
      if (!((_e = p.componentIds) == null ? void 0 : _e.length) || p.componentIds.length < 2) throw new Error("Provide either componentIds (min 2 existing component IDs) or children (min 2 inline variant components).");
      const comps = [];
      for (const id of p.componentIds) {
        const node = yield figma.getNodeByIdAsync(id);
        if (!node) throw new Error(`Component not found: ${id}`);
        if (node.type !== "COMPONENT") throw new Error(`Node ${id} is not a COMPONENT`);
        comps.push(node);
      }
      for (const comp of comps) {
        try {
          const defs = comp.componentPropertyDefinitions;
          for (const [key, def] of Object.entries(defs)) {
            if (def.type === "TEXT") {
              let bound = false;
              const walk = (n) => {
                if ("componentPropertyReferences" in n) {
                  const refs = n.componentPropertyReferences;
                  if (refs && Object.values(refs).includes(key)) bound = true;
                }
                if ("children" in n) n.children.forEach(walk);
              };
              walk(comp);
              if (!bound) {
                throw new Error(`Component "${comp.name}" has stale TEXT property "${key.split("#")[0]}" \u2014 no text node references it. Delete it first: components(method:"update", items:[{id:"${comp.id}", action:"delete", propertyName:"${key.split("#")[0]}"}])`);
              }
            }
          }
        } catch (e) {
          if (e.message.includes("stale TEXT property")) throw e;
        }
      }
      const parent = comps[0].parent && comps.every((c) => c.parent === comps[0].parent) ? comps[0].parent : figma.currentPage;
      const set = figma.combineAsVariants(comps, parent);
      if (p.name) set.name = p.name;
      set.layoutMode = "NONE";
      set.cornerRadius = 0;
      const { hints } = yield setupFrameNode(set, p);
      if ((_f = p._inlineHints) == null ? void 0 : _f.length) hints.push(...p._inlineHints);
      if (p.variantPropertyName) {
        const defs = set.componentPropertyDefinitions;
        const variantKeys = Object.keys(defs).filter((k) => defs[k].type === "VARIANT");
        let autoKey = variantKeys.find((k) => /^Property \d+$/.test(k));
        if (!autoKey && variantKeys.length === 1) autoKey = variantKeys[0];
        if (autoKey) {
          try {
            set.editComponentProperty(autoKey, { name: p.variantPropertyName });
          } catch (e) {
            hints.push({ type: "error", message: `Failed to rename variant property "${autoKey}" to "${p.variantPropertyName}": ${e.message}` });
          }
        } else if (variantKeys.length === 0) {
          hints.push({ type: "error", message: `No VARIANT properties found to rename.` });
        } else {
          hints.push({ type: "warn", message: `Multiple variant properties found (${variantKeys.join(", ")}). Cannot auto-rename \u2014 use components(method:"update", action:"edit") to rename each.` });
        }
      }
      const unboundCount = comps.reduce((n, c) => {
        return n + findTextNodes(c).filter((t) => {
          var _a2;
          return !((_a2 = t.componentPropertyReferences) == null ? void 0 : _a2.characters);
        }).length;
      }, 0);
      const result = { id: set.id };
      if (unboundCount > 0) {
        hints.push({ type: "suggest", message: `${unboundCount} text node${unboundCount > 1 ? "s" : ""} across variants not exposed as properties \u2014 instances cannot edit this text via properties. Fix: components(method:"update", items:[{id:"${set.id}", propertyName:"<textNodeName>", type:"TEXT", defaultValue:"<text>"}]) then bind via text/frames(method:"update", items:[{id:"<textNodeId>", componentPropertyName:"<propName>"}])` });
      }
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  var VARIANT_SET_KEYS = /* @__PURE__ */ new Set([...componentsCreateVariantSet, "nodeIds"]);
  function createSlotSingle(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      let comp = null;
      let parent = null;
      if (p.componentId) {
        const node = yield figma.getNodeByIdAsync(p.componentId);
        if (!node) throw new Error(`Component not found: ${p.componentId}`);
        if (node.type !== "COMPONENT") throw new Error(`Slots can only be created inside components \u2014 "${node.name || p.componentId}" is a ${node.type}. Pass the ID of a COMPONENT node as componentId.`);
        comp = node;
      } else if (p.parentId) {
        parent = yield figma.getNodeByIdAsync(p.parentId);
        if (!parent) throw new Error(`Parent not found: ${p.parentId}`);
        let cursor = parent;
        while (cursor) {
          if (cursor.type === "COMPONENT") {
            comp = cursor;
            break;
          }
          cursor = cursor.parent;
        }
        if (!comp) throw new Error(`No ancestor component found for parentId "${p.parentId}". Slots must live inside a component \u2014 pass parentId of a node within a component, or componentId of the owning component.`);
      } else {
        throw new Error(`Slots must be created inside a component. Pass parentId (a frame inside a component) or componentId (the component itself).`);
      }
      const slot = comp.createSlot();
      if (p.name) slot.name = p.name;
      if (p.parentId && p.parentId !== comp.id) {
        parent != null ? parent : parent = yield figma.getNodeByIdAsync(p.parentId);
        if (!parent) throw new Error(`Parent not found: ${p.parentId}`);
        if (!("appendChild" in parent)) {
          throw new Error(`Parent does not support children: ${p.parentId}. Only FRAME, COMPONENT, GROUP, SECTION, SLOT, and PAGE nodes can have children.`);
        }
        let parentOwner = parent;
        while (parentOwner && parentOwner.type !== "COMPONENT") parentOwner = parentOwner.parent;
        if ((parentOwner == null ? void 0 : parentOwner.id) !== comp.id) {
          throw new Error(`Parent "${parent.name || p.parentId}" is not inside component "${comp.name}". Pass parentId of a node within the owning component, or omit parentId to create the slot at the component root.`);
        }
        parent.appendChild(slot);
      }
      (_a = p.layoutMode) != null ? _a : p.layoutMode = "VERTICAL";
      (_b = p.layoutSizingHorizontal) != null ? _b : p.layoutSizingHorizontal = "FILL";
      (_c = p.layoutSizingVertical) != null ? _c : p.layoutSizingVertical = "HUG";
      const slotParentId = (_d = slot.parent) == null ? void 0 : _d.id;
      const _e = p, { componentId: _cid } = _e, frameParams = __objRest(_e, ["componentId"]);
      frameParams.parentId = slotParentId;
      frameParams._skipOverlapCheck = true;
      const { hints } = yield setupFrameNode(slot, frameParams);
      const result = { id: slot.id };
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function createComponentDispatch(params) {
    return __async(this, null, function* () {
      switch (params.type) {
        case "component":
          return batchHandler(params, createComponentSingle, { keys: componentsCreateComponent, help: 'components(method: "help", topic: "create")' });
        case "from_node":
          return batchHandler(params, fromNodeSingle, { keys: componentsCreateFromNode, help: 'components(method: "help", topic: "create")' });
        case "variant_set":
          return batchHandler(params, combineSingle, { keys: VARIANT_SET_KEYS, help: 'components(method: "help", topic: "create")' });
        default:
          throw new Error(`Unknown create type: ${params.type}`);
      }
    });
  }
  function getComponentFigma(params) {
    return __async(this, null, function* () {
      const depth = params.depth;
      const verbose = params.verbose === true;
      const names = params.names;
      let targets = [];
      if (names == null ? void 0 : names.length) {
        yield figma.loadAllPagesAsync();
        const all = figma.root.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] }).filter((c) => !c.remote).filter((c) => {
          var _a;
          return !(c.type === "COMPONENT" && ((_a = c.parent) == null ? void 0 : _a.type) === "COMPONENT_SET");
        });
        for (const name of names) {
          const nameLower = name.toLowerCase();
          const match = all.find((c) => c.name.toLowerCase() === nameLower) || all.find((c) => c.name.toLowerCase().includes(nameLower));
          if (!match) {
            targets.push({ node: null, error: `Not found`, name });
            continue;
          }
          targets.push({ node: match });
        }
      } else {
        const node = yield figma.getNodeByIdAsync(params.id);
        if (!node) throw new Error(`Component not found: ${params.id}`);
        if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") throw new Error(`Not a component: ${node.type}`);
        if (node.remote) throw new Error(`Component "${node.name}" is from an external library. To customize: components(method:"clone", id:"<instanceId>") to clone the library component into a local copy, then edit the new local component.`);
        targets.push({ node });
      }
      if (depth === void 0) {
        const results2 = targets.map((t) => {
          if (!t.node) return { name: t.name, error: t.error };
          return serializeComponentSummary(t.node);
        });
        return { results: results2 };
      }
      const { serializeNode: serializeNode2, DEFAULT_NODE_BUDGET: DEFAULT_NODE_BUDGET2 } = yield Promise.resolve().then(() => (init_serialize_node(), serialize_node_exports));
      const budget = { remaining: DEFAULT_NODE_BUDGET2 };
      const results = [];
      for (const t of targets) {
        if (!t.node) {
          results.push({ name: t.name, error: t.error });
          continue;
        }
        try {
          const serialized = yield serializeNode2(t.node, depth, 0, budget, verbose);
          const summary = serializeComponentSummary(t.node);
          if (summary.properties) serialized.properties = summary.properties;
          if (summary._error) serialized._error = summary._error;
          results.push(serialized);
        } catch (e) {
          const degraded = { id: t.node.id, name: t.node.name, type: t.node.type };
          if ("children" in t.node) {
            degraded.children = t.node.children.map((c) => ({ id: c.id, name: c.name, type: c.type }));
          }
          degraded._error = `Component set has duplicate variant value combinations \u2014 property definitions unavailable.`;
          results.push(degraded);
        }
      }
      const out = { results };
      if (budget.remaining <= 0) {
        out._truncated = true;
      }
      return out;
    });
  }
  function serializeComponentSummary(node) {
    const out = { id: node.id, name: node.name };
    if (node.description) out.description = node.description;
    try {
      const defs = node.componentPropertyDefinitions;
      if (defs && Object.keys(defs).length > 0) {
        const props = {};
        for (const [key, def] of Object.entries(defs)) {
          const clean = key.indexOf("#") > 0 ? key.slice(0, key.indexOf("#")) : key;
          const p = { type: def.type };
          if (def.defaultValue !== void 0) p.defaultValue = def.defaultValue;
          if (def.type === "VARIANT" && def.variantOptions) p.options = def.variantOptions;
          props[clean] = p;
        }
        out.properties = props;
      }
    } catch (e) {
      out._error = `Component set "${node.name}" has duplicate variant value combinations \u2014 Figma's Plugin API cannot read property definitions in this state. Fix the conflicting variant names in Figma to restore access.`;
    }
    return out;
  }
  function listComponentsFigma(params) {
    return __async(this, null, function* () {
      var _a;
      yield figma.loadAllPagesAsync();
      let components = figma.root.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] }).filter((c) => !c.remote).filter((c) => {
        var _a2;
        if (c.type === "COMPONENT" && ((_a2 = c.parent) == null ? void 0 : _a2.type) === "COMPONENT_SET") return false;
        if (c.name.startsWith("_")) return false;
        return true;
      });
      const nameFilter = (_a = params == null ? void 0 : params.query) != null ? _a : params == null ? void 0 : params.name;
      if (nameFilter) {
        const f = nameFilter.toLowerCase();
        components = components.filter((c) => c.name.toLowerCase().includes(f));
      }
      const paged = paginate(components, params.offset, params.limit);
      const items = paged.items.map((c) => c.name);
      return __spreadProps(__spreadValues({}, paged), { items });
    });
  }
  function updateComponentPropertySingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.id);
      if (!node) throw new Error(`Node not found: ${p.id}`);
      if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") throw new Error(`Node ${p.id} is a ${node.type}, not a COMPONENT or COMPONENT_SET.`);
      if (node.remote) throw new Error(`Component "${node.name}" is from an external library. Clone it first with components(method:"clone", id:"<instanceId>") to get a local copy.`);
      const comp = node;
      function resolveKey(name) {
        var _a;
        return (_a = resolveComponentPropertyKey(comp.componentPropertyDefinitions, name)) != null ? _a : name;
      }
      if (p.action === "delete") {
        comp.deleteComponentProperty(resolveKey(p.propertyName));
        return {};
      }
      if (p.action === "rename_variant") {
        if (comp.type !== "COMPONENT_SET") throw new Error("rename_variant requires a COMPONENT_SET node");
        const propName = p.propertyName;
        if (p.defaultValue === void 0 || p.name === void 0) throw new Error("rename_variant requires defaultValue (current option name) and name (new option name)");
        const fromValue = String(p.defaultValue);
        const toValue = String(p.name);
        let renamed = 0;
        for (const child of comp.children) {
          if (child.type !== "COMPONENT") continue;
          const vp = child.variantProperties;
          if (!vp || vp[propName] !== fromValue) continue;
          const parts = child.name.split(", ");
          child.name = parts.map((part) => {
            const eq = part.indexOf("=");
            if (eq === -1) return part;
            const key2 = part.slice(0, eq).trim();
            const val = part.slice(eq + 1).trim();
            return key2 === propName && val === fromValue ? `${key2}=${toValue}` : part;
          }).join(", ");
          renamed++;
        }
        if (renamed === 0) {
          const available = comp.children.filter((c) => {
            var _a;
            return c.type === "COMPONENT" && ((_a = c.variantProperties) == null ? void 0 : _a[propName]);
          }).map((c) => c.variantProperties[propName]);
          throw new Error(`No variant with ${propName}="${fromValue}" found. Available: [${[...new Set(available)].join(", ")}]`);
        }
        return { renamed };
      }
      if (p.action === "edit") {
        const propKey = resolveKey(p.propertyName);
        const propDef = comp.componentPropertyDefinitions[propKey];
        if ((propDef == null ? void 0 : propDef.type) === "VARIANT" && p.defaultValue !== void 0 && comp.type === "COMPONENT_SET") {
          const targetChild = comp.children.find((c) => {
            var _a;
            if (c.type !== "COMPONENT") return false;
            return ((_a = c.variantProperties) == null ? void 0 : _a[propKey]) === String(p.defaultValue);
          });
          if (!targetChild) {
            const available = comp.children.filter((c) => c.type === "COMPONENT").map((c) => {
              var _a;
              return (_a = c.variantProperties) == null ? void 0 : _a[propKey];
            }).filter(Boolean);
            throw new Error(`Variant "${p.defaultValue}" not found for property "${propKey}". Available: [${[...new Set(available)].join(", ")}]`);
          }
          comp.insertChild(0, targetChild);
          const edit2 = {};
          if (p.name !== void 0) edit2.name = p.name;
          if (p.preferredValues !== void 0) edit2.preferredValues = p.preferredValues;
          if (Object.keys(edit2).length > 0) comp.editComponentProperty(propKey, edit2);
          return {};
        }
        const edit = {};
        if (p.name !== void 0) edit.name = p.name;
        if (p.defaultValue !== void 0) edit.defaultValue = p.defaultValue;
        if (p.preferredValues !== void 0) edit.preferredValues = p.preferredValues;
        const newKey = comp.editComponentProperty(propKey, edit);
        return { propertyKey: newKey };
      }
      const options = p.preferredValues ? { preferredValues: p.preferredValues } : void 0;
      comp.addComponentProperty(p.propertyName, p.type, p.defaultValue, options);
      const key = resolveComponentPropertyKey(comp.componentPropertyDefinitions, p.propertyName);
      if (key && p.type === "TEXT") {
        const roots = node.type === "COMPONENT_SET" ? comp.children.filter((c) => c.type === "COMPONENT") : [node];
        for (const root of roots) {
          const textNode = findTextNodes(root).find(
            (t) => t.name === p.propertyName || t.characters === p.defaultValue
          );
          if (textNode) textNode.componentPropertyReferences = { characters: key };
        }
      }
      return key ? { propertyKey: key } : {};
    });
  }
  function deleteComponentSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.id);
      if (!node) throw new Error(`Node not found: ${p.id}`);
      if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") throw new Error(`Node ${p.id} is a ${node.type}, not a COMPONENT or COMPONENT_SET.`);
      node.remove();
      return {};
    });
  }
  function collectTextWithPath(node, path, skipInstances) {
    if (node.type === "TEXT") return [{ node, path }];
    if (skipInstances && node.type === "INSTANCE") return [];
    if ("children" in node) {
      const result = [];
      for (const child of node.children) {
        result.push(...collectTextWithPath(child, path ? `${path} > ${child.name}` : child.name, skipInstances));
      }
      return result;
    }
    return [];
  }
  function auditComponentBindings(comp) {
    var _a;
    const defOwner = comp.type === "COMPONENT" && ((_a = comp.parent) == null ? void 0 : _a.type) === "COMPONENT_SET" ? comp.parent : comp;
    const defs = defOwner.componentPropertyDefinitions;
    const textPropKeys = Object.keys(defs).filter((k) => defs[k].type === "TEXT");
    const roots = comp.type === "COMPONENT_SET" ? comp.children.filter((c) => c.type === "COMPONENT") : [comp];
    const allTextEntries = [];
    for (const root of roots) {
      allTextEntries.push(...collectTextWithPath(root, "", true).map((e) => __spreadProps(__spreadValues({}, e), { root })));
    }
    const boundKeys = /* @__PURE__ */ new Set();
    for (const { node } of allTextEntries) {
      const refs = node.componentPropertyReferences;
      if (refs == null ? void 0 : refs.characters) boundKeys.add(refs.characters);
    }
    const unboundText = allTextEntries.filter(({ node }) => {
      const refs = node.componentPropertyReferences;
      return !(refs == null ? void 0 : refs.characters);
    }).map(({ node }) => {
      var _a2;
      return {
        id: node.id,
        name: node.name,
        characters: (_a2 = node.characters) == null ? void 0 : _a2.slice(0, 80)
      };
    });
    const orphanedProperties = textPropKeys.filter((k) => !boundKeys.has(k)).map((k) => {
      var _a2;
      return {
        key: k,
        name: k.split("#")[0],
        defaultValue: String((_a2 = defs[k].defaultValue) != null ? _a2 : "")
      };
    });
    const unboundNested = allTextEntries.filter(({ node, path }) => {
      const refs = node.componentPropertyReferences;
      return !(refs == null ? void 0 : refs.characters) && path.includes(" > ");
    }).map(({ node, path }) => {
      var _a2;
      return {
        id: node.id,
        name: node.name,
        characters: (_a2 = node.characters) == null ? void 0 : _a2.slice(0, 80),
        path
      };
    });
    const issues = unboundText.length + orphanedProperties.length;
    const summary = issues === 0 ? "All TEXT properties are bound and all text nodes are connected." : `Found ${unboundText.length} unbound text node${unboundText.length !== 1 ? "s" : ""}, ${orphanedProperties.length} orphaned propert${orphanedProperties.length !== 1 ? "ies" : "y"}.`;
    return { unboundText, orphanedProperties, unboundNested, summary };
  }
  function auditComponentFigma(params) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(params.id);
      if (!node) throw new Error(`Component not found: ${params.id}`);
      if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") throw new Error(`Not a component: ${node.type}`);
      const lintResult = yield lintNodeHandler({ nodeId: params.id, rules: params.rules, maxDepth: params.maxDepth, maxFindings: params.maxFindings });
      lintResult.categories = lintResult.categories.filter((c) => c.rule !== "component-bindings");
      const bindings = auditComponentBindings(node);
      if (bindings.unboundText.length > 0 || bindings.orphanedProperties.length > 0) {
        const bindingNodes = [];
        for (const t of bindings.unboundText) {
          bindingNodes.push({ id: t.id, name: t.name, issue: "unbound-text", characters: t.characters });
        }
        for (const p of bindings.orphanedProperties) {
          bindingNodes.push({ id: node.id, name: node.name, severity: "unsafe", issue: "orphaned-property", propertyKey: p.key, propertyName: p.name });
        }
        for (const n of bindings.unboundNested) {
          bindingNodes.push({ id: n.id, name: n.name, severity: "style", issue: "unexposed-nested", path: n.path, characters: n.characters });
        }
        lintResult.categories.push({
          rule: "component-bindings",
          severity: "heuristic",
          category: "component",
          count: bindingNodes.length,
          fix: 'Bind text nodes to properties or delete orphaned ones. guidelines(topic:"component-structure") for details.',
          nodes: bindingNodes
        });
      }
      return lintResult;
    });
  }
  function instanceCreateSingle(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      let node;
      if (p.componentKey) {
        try {
          node = yield figma.importComponentByKeyAsync(p.componentKey);
        } catch (err) {
          try {
            node = yield figma.importComponentSetByKeyAsync(p.componentKey);
          } catch (e) {
            throw new Error(`Could not import by componentKey "${p.componentKey}": ${(err == null ? void 0 : err.message) || err}. Ensure the source library is enabled for this file.`);
          }
        }
      } else {
        if (!p.componentId) throw new Error(`Missing componentId (local node) or componentKey (published library).`);
        node = yield figma.getNodeByIdAsync(p.componentId);
        if (!node) {
          yield figma.loadAllPagesAsync();
          node = yield figma.getNodeByIdAsync(p.componentId);
        }
        if (!node) throw new Error(`Component not found: ${p.componentId}`);
      }
      if (node.type === "COMPONENT_SET") {
        if (!((_a = node.children) == null ? void 0 : _a.length)) throw new Error("Component set has no variants");
        if (p.variantProperties && typeof p.variantProperties === "object") {
          const match = node.children.find((child) => {
            if (child.type !== "COMPONENT" || !child.variantProperties) return false;
            return Object.entries(p.variantProperties).every(
              ([k, v]) => {
                if (child.variantProperties[k] === v) return true;
                const prefixedKey = `${node.name}/${k}`;
                return child.variantProperties[prefixedKey] === v;
              }
            );
          });
          if (match) node = match;
          else {
            const prefix = `${node.name}/`;
            const available = node.children.filter((c) => c.type === "COMPONENT").map((c) => {
              const props2 = {};
              for (const [k, v] of Object.entries(c.variantProperties || {})) {
                props2[k.startsWith(prefix) ? k.slice(prefix.length) : k] = v;
              }
              return props2;
            });
            throw new Error(`No variant matching ${JSON.stringify(p.variantProperties)} in ${node.name}. Available: ${JSON.stringify(available)}`);
          }
        } else {
          node = node.defaultVariant || node.children[0];
        }
      }
      if (node.type !== "COMPONENT") throw new Error(`Not a component: ${node.type}`);
      const inst = node.createInstance();
      if (p.name) inst.name = p.name;
      if (p.x !== void 0) inst.x = p.x;
      if (p.y !== void 0) inst.y = p.y;
      if (p.width !== void 0 || p.height !== void 0) {
        inst.resize((_b = p.width) != null ? _b : inst.width, (_c = p.height) != null ? _c : inst.height);
      }
      const hints = [];
      yield applyTokens(inst, { opacity: p.opacity }, hints);
      if (p.minWidth !== void 0) inst.minWidth = p.minWidth;
      if (p.maxWidth !== void 0) inst.maxWidth = p.maxWidth;
      if (p.minHeight !== void 0) inst.minHeight = p.minHeight;
      if (p.maxHeight !== void 0) inst.maxHeight = p.maxHeight;
      const autoSizing = p.sizing === "contextual";
      const parent = yield appendAndApplySizing(inst, p, hints, autoSizing);
      checkOverlappingSiblings(inst, parent, hints);
      if (p.explicitMode) {
        const allCollections = yield figma.variables.getLocalVariableCollectionsAsync();
        const em = p.explicitMode;
        let collection;
        let modeId;
        if (em.collectionName) {
          const cName = em.collectionName.toLowerCase();
          collection = allCollections.find((c) => c.name.toLowerCase() === cName);
          if (!collection) hints.push({ type: "error", message: `explicitMode: collection "${em.collectionName}" not found. Available: ${allCollections.map((c) => c.name).join(", ")}` });
        } else if (em.collectionId) {
          collection = allCollections.find((c) => c.id === em.collectionId);
          if (!collection) hints.push({ type: "error", message: `explicitMode: collection ID "${em.collectionId}" not found.` });
        }
        if (collection) {
          if (em.modeName) {
            const mName = em.modeName.toLowerCase();
            const mode = collection.modes.find((m) => m.name.toLowerCase() === mName);
            if (!mode) hints.push({ type: "error", message: `explicitMode: mode "${em.modeName}" not found in "${collection.name}". Available: ${collection.modes.map((m) => m.name).join(", ")}` });
            else modeId = mode.modeId;
          } else {
            modeId = em.modeId;
          }
          if (modeId) {
            try {
              inst.setExplicitVariableModeForCollection(collection, modeId);
            } catch (e) {
              hints.push({ type: "error", message: `explicitMode failed: ${e.message}` });
            }
          }
        }
      }
      const props = (_d = p.properties) != null ? _d : p.componentProperties;
      if (props && typeof props === "object" && Object.keys(props).length > 0) {
        yield instanceUpdateComponentProps(inst, props);
      }
      const result = { id: inst.id };
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function instanceGetFigma(params) {
    return __async(this, null, function* () {
      const { serializeNode: serializeNode2, DEFAULT_NODE_BUDGET: DEFAULT_NODE_BUDGET2 } = yield Promise.resolve().then(() => (init_serialize_node(), serialize_node_exports));
      const node = yield figma.getNodeByIdAsync(params.id);
      if (!node) throw new Error(`Instance not found: ${params.id}`);
      if (node.type !== "INSTANCE") throw new Error("Node is not an instance");
      const depth = params.depth !== void 0 ? params.depth : 0;
      const verbose = params.verbose === true;
      const budget = { remaining: DEFAULT_NODE_BUDGET2 };
      const serialized = yield serializeNode2(node, depth, 0, budget, verbose);
      const out = { results: [serialized] };
      if (budget.remaining <= 0) {
        out._truncated = true;
      }
      return out;
    });
  }
  function instanceUpdateComponentProps(inst, props) {
    return __async(this, null, function* () {
      var _a;
      const resolvedProps = {};
      for (const [key, value] of Object.entries(props)) {
        resolvedProps[(_a = resolveComponentPropertyKey(inst.componentProperties, key)) != null ? _a : key] = value;
      }
      inst.setProperties(resolvedProps);
    });
  }
  function instanceUpdateSingle(p) {
    return __async(this, null, function* () {
      var _a;
      const node = yield figma.getNodeByIdAsync(p.id);
      if (!node) throw new Error(`Node not found: ${p.id}`);
      if (node.type !== "INSTANCE") throw new Error(`Node ${p.id} is ${node.type}, not an INSTANCE`);
      const inst = node;
      const props = (_a = p.properties) != null ? _a : p.componentProperties;
      if (!props || typeof props !== "object") throw new Error(`Missing 'properties' \u2014 pass a key\u2192value map, e.g. {"Label#1:0":"text"}`);
      yield instanceUpdateComponentProps(inst, props);
      return {};
    });
  }
  function instanceSwapSingle(p) {
    return __async(this, null, function* () {
      var _a;
      const node = yield figma.getNodeByIdAsync(p.id);
      if (!node) throw new Error(`Node not found: ${p.id}`);
      if (node.type !== "INSTANCE") throw new Error(`Node ${p.id} is ${node.type}, not an INSTANCE`);
      let comp = yield figma.getNodeByIdAsync(p.componentId);
      if (!comp) throw new Error(`Component not found: ${p.componentId}`);
      if (comp.type === "COMPONENT_SET") comp = comp.defaultVariant || ((_a = comp.children) == null ? void 0 : _a[0]);
      if (comp.type !== "COMPONENT") throw new Error(`Node ${p.componentId} is ${comp.type}, not a COMPONENT`);
      node.swapComponent(comp);
      return {};
    });
  }
  function instanceDetachSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.id);
      if (!node) throw new Error(`Node not found: ${p.id}`);
      if (node.type !== "INSTANCE") throw new Error(`Node ${p.id} is ${node.type}, not an INSTANCE`);
      const frame = node.detachInstance();
      return { id: frame.id };
    });
  }
  function instanceResetOverridesSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.id);
      if (!node) throw new Error(`Node not found: ${p.id}`);
      if (node.type !== "INSTANCE") throw new Error(`Node ${p.id} is ${node.type}, not an INSTANCE`);
      node.removeOverrides();
      return {};
    });
  }
  var VISUAL_KEYS = [...nodeUpdate];
  function instanceUpdateCombined(p) {
    return __async(this, null, function* () {
      const items = p.items || [p];
      const anyVisual = items.some((item) => VISUAL_KEYS.some((k) => item[k] !== void 0));
      if (!anyVisual) {
        return batchHandler(p, instanceUpdateSingle, { keys: instancesUpdate, help: 'instances(method: "help", topic: "update")' });
      }
      let textCtx = null;
      const textItems = items.filter((item) => hasAny(item, TEXT_KEYS));
      if (textItems.length > 0) {
        const syntheticItems = textItems.map((item) => ({
          nodeId: item.id,
          fontSize: item.fontSize,
          fontFamily: item.fontFamily,
          fontStyle: item.fontStyle,
          fontWeight: item.fontWeight,
          textStyleId: item.textStyleId,
          textStyleName: item.textStyleName
        }));
        textCtx = yield prepSetTextProperties({ items: syntheticItems });
      }
      return batchHandler(p, (item) => __async(null, null, function* () {
        var _b, _c;
        const result = {};
        const hints = [];
        const hasVisual = VISUAL_KEYS.some((k) => item[k] !== void 0);
        if (hasVisual) {
          const _a = item, { properties: _cp, componentProperties: _ccp } = _a, visualItem = __objRest(_a, ["properties", "componentProperties"]);
          const patchItem = __spreadProps(__spreadValues({}, visualItem), { nodeId: (_b = item.nodeId) != null ? _b : item.id });
          const r = yield patchSingleNode(patchItem, textCtx);
          if (r.hints) hints.push(...r.hints);
          Object.assign(result, r);
          delete result.hints;
        }
        const props = (_c = item.properties) != null ? _c : item.componentProperties;
        if (props && typeof props === "object") {
          const node = yield figma.getNodeByIdAsync(item.id);
          if (!node) throw new Error(`Node not found: ${item.id}`);
          if (node.type !== "INSTANCE") throw new Error(`Node ${item.id} is ${node.type}, not an INSTANCE`);
          yield instanceUpdateComponentProps(node, props);
        }
        if (hints.length > 0) result.hints = hints;
        return result;
      }), { keys: instancesUpdate, help: 'instances(method: "help", topic: "update")' });
    });
  }
  var figmaHandlers16 = {
    components: createDispatcher({
      create: createComponentDispatch,
      get: getComponentFigma,
      list: listComponentsFigma,
      update: (p) => batchHandler(p, updateComponentPropertySingle, { keys: componentsUpdate, help: 'components(method: "help", topic: "update")' }),
      audit: auditComponentFigma,
      delete: (p) => batchHandler(p, deleteComponentSingle)
    }),
    instances: createDispatcher({
      create: (p) => batchHandler(p, instanceCreateSingle, { keys: instancesCreate, help: 'instances(method: "help", topic: "create")' }),
      get: instanceGetFigma,
      update: (p) => batchHandler(p, instanceUpdateSingle, { keys: instancesUpdate, help: 'instances(method: "help", topic: "update")' }),
      swap: (p) => batchHandler(p, instanceSwapSingle, { keys: instancesSwap, help: 'instances(method: "help", topic: "swap")' }),
      detach: (p) => batchHandler(p, instanceDetachSingle, { keys: instancesDetach, help: 'instances(method: "help", topic: "detach")' }),
      reset_overrides: (p) => batchHandler(p, instanceResetOverridesSingle, { keys: instancesResetOverrides, help: 'instances(method: "help", topic: "reset_overrides")' })
    })
  };

  // src/handlers/create-frame.ts
  function resolveLayoutMode(p) {
    const hasALParams = p.paddingTop !== void 0 || p.paddingRight !== void 0 || p.paddingBottom !== void 0 || p.paddingLeft !== void 0 || p.itemSpacing !== void 0 || p.primaryAxisAlignItems !== void 0 || p.counterAxisAlignItems !== void 0 || p.counterAxisSpacing !== void 0 || p.layoutWrap !== void 0 && p.layoutWrap !== "NO_WRAP";
    const hasHUGSizing = p.layoutSizingHorizontal === "HUG" || p.layoutSizingVertical === "HUG";
    if (p.layoutMode === "NONE" && (hasALParams || hasHUGSizing)) {
      const alProps = [
        hasALParams && "padding/spacing/alignment",
        hasHUGSizing && "HUG sizing"
      ].filter(Boolean).join(" and ");
      throw new Error(`layoutMode:'NONE' conflicts with ${alProps}. Static frames do not support layout properties. Remove layoutMode:'NONE' to enable auto-layout.`);
    }
    if (p.layoutMode === "NONE" && (p.width === void 0 || p.height === void 0)) {
      throw new Error("layoutMode:'NONE' creates a static frame \u2014 specify both width and height. Omit layoutMode to let the frame shrink to content automatically.");
    }
    if (p.layoutMode !== void 0) return { layoutMode: p.layoutMode, inferred: false };
    if (hasALParams || hasHUGSizing) {
      return { layoutMode: "VERTICAL", inferred: true };
    }
    return { layoutMode: "NONE", inferred: false };
  }
  function setupFrameNode(node, p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f;
      normalizeAliases(p, FRAME_ALIAS_KEYS);
      if (p.x !== void 0) node.x = p.x;
      if (p.y !== void 0) node.y = p.y;
      if (p.width !== void 0 || p.height !== void 0) {
        node.resize((_a = p.width) != null ? _a : node.width, (_b = p.height) != null ? _b : node.height);
      }
      node.fills = [];
      if (p.padding !== void 0) {
        (_c = p.paddingTop) != null ? _c : p.paddingTop = p.padding;
        (_d = p.paddingRight) != null ? _d : p.paddingRight = p.padding;
        (_e = p.paddingBottom) != null ? _e : p.paddingBottom = p.padding;
        (_f = p.paddingLeft) != null ? _f : p.paddingLeft = p.padding;
      }
      const { layoutMode, inferred: inferredLayoutMode } = resolveLayoutMode(p);
      const {
        layoutWrap = "NO_WRAP",
        primaryAxisAlignItems = "MIN",
        counterAxisAlignItems = "MIN",
        layoutSizingHorizontal = "FIXED",
        layoutSizingVertical = "FIXED",
        parentId
      } = p;
      const hints = [];
      if (inferredLayoutMode) {
        hints.push({ type: "suggest", message: `No layoutMode specified \u2014 defaulted to layoutMode:'${layoutMode}' because padding/spacing/alignment require auto-layout.` });
      }
      yield applyCornerRadius(node, p, hints);
      yield applyTokens(node, { opacity: p.opacity }, hints);
      if (p.visible === false) node.visible = false;
      if (p.locked === true) node.locked = true;
      if (p.rotation !== void 0) node.rotation = p.rotation;
      if (p.blendMode) node.blendMode = p.blendMode;
      if (p.layoutPositioning === "ABSOLUTE") node.layoutPositioning = "ABSOLUTE";
      if (p.overflowDirection && p.overflowDirection !== "NONE") node.overflowDirection = p.overflowDirection;
      if (layoutMode !== "NONE") {
        if (layoutWrap === "WRAP" && layoutMode === "VERTICAL") {
          throw new Error("layoutWrap 'WRAP' requires layoutMode 'HORIZONTAL' \u2014 Figma does not support wrap on vertical layouts. Use column frames inside a horizontal parent for vertical grid patterns.");
        }
        node.layoutMode = layoutMode;
        node.layoutWrap = layoutWrap;
        for (const f of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
          if (p[f] === void 0) node[f] = 0;
        }
        yield applyTokens(node, {
          paddingTop: p.paddingTop,
          paddingRight: p.paddingRight,
          paddingBottom: p.paddingBottom,
          paddingLeft: p.paddingLeft,
          itemSpacing: p.itemSpacing
        }, hints);
        node.primaryAxisAlignItems = primaryAxisAlignItems;
        node.counterAxisAlignItems = counterAxisAlignItems;
        if (p.counterAxisSpacing !== void 0) {
          if (layoutWrap !== "WRAP") {
            node.layoutWrap = "WRAP";
            hints.push({ type: "confirm", message: "Enabled layoutWrap='WRAP' because counterAxisSpacing requires it." });
          }
          yield applyTokens(node, { counterAxisSpacing: p.counterAxisSpacing }, hints);
        }
      }
      const hasImageFill = yield applyImageFill(node, p, hints);
      if (!hasImageFill) yield applyFillWithAutoBind(node, p, hints);
      yield applyStrokeWithAutoBind(node, p, hints);
      if (p.strokeAlign) node.strokeAlign = p.strokeAlign;
      if (p.strokesIncludedInLayout !== void 0) node.strokesIncludedInLayout = p.strokesIncludedInLayout;
      if (p.effectStyleName) {
        const styles = yield figma.getLocalEffectStylesAsync();
        const exact = styles.find((s) => s.name === p.effectStyleName);
        const match = exact || styles.find((s) => s.name.toLowerCase().includes(p.effectStyleName.toLowerCase()));
        if (match) {
          yield node.setEffectStyleIdAsync(match.id);
        } else if (p._effectStyleKey) {
          try {
            const style = yield figma.importStyleByKeyAsync(p._effectStyleKey);
            yield node.setEffectStyleIdAsync(style.id);
          } catch (e) {
            hints.push({ type: "error", message: `effectStyleName '${p.effectStyleName}' (library import) failed: ${e.message}. Ensure the source library is enabled for this file.` });
          }
        } else {
          const names = styles.map((s) => s.name).slice(0, 20);
          const suffix = styles.length > 20 ? `, \u2026 and ${styles.length - 20} more` : "";
          hints.push({ type: "error", message: `effectStyleName '${p.effectStyleName}' not found. Available: [${names.join(", ")}${suffix}]` });
        }
      }
      if (p.minWidth !== void 0) node.minWidth = p.minWidth;
      if (p.maxWidth !== void 0) node.maxWidth = p.maxWidth;
      if (p.minHeight !== void 0) node.minHeight = p.minHeight;
      if (p.maxHeight !== void 0) node.maxHeight = p.maxHeight;
      const parent = yield appendAndApplySizing(node, p, hints);
      if (!p._skipOverlapCheck) {
        checkOverlappingSiblings(node, parent, hints);
      }
      if (layoutMode !== "NONE" && node.layoutSizingHorizontal === "HUG" && node.layoutSizingVertical === "HUG") {
        const isRoot = !parent || parent.type === "PAGE";
        const children = "children" in node ? node.children : [];
        const hasTextChildren = children.some((c) => c.type === "TEXT");
        const hasFillChildren = children.some((c) => c.layoutSizingHorizontal === "FILL");
        if (isRoot && (hasTextChildren || hasFillChildren) && !isSmallIntrinsic(node)) {
          const name = node.name || "Frame";
          hints.push({ type: "warn", message: `"${name}" has HUG on both axes with ${hasTextChildren ? "text" : "FILL"} children but no width constraint. Text won't wrap and FILL children collapse. Set a width and layoutSizingHorizontal:"FIXED".` });
        }
      }
      warnCrossAxisHug(node, parent, hints);
      if (looksInteractive(node) && (node.width < 24 || node.height < 24)) {
        hints.push({ type: "suggest", message: "WCAG: Min 24x24px for touch targets." });
      }
      applyAnnotations(node, p, hints);
      return { parent, hints };
    });
  }
  function createSingleFrame(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const hints = [];
      if ((_a = p.children) == null ? void 0 : _a.length) {
        const originalParams = p._originalParams;
        delete p._originalParams;
        normalizeInlineChildTypes(p.children);
        const validation = validateAndFixInlineChildren(p, hints);
        if (validation.hasAmbiguity) {
          const diff = formatDiff(validation.inferences);
          const correctedPayload = buildCorrectedPayload(p, originalParams);
          const canEdit = (_b = p._caps) == null ? void 0 : _b.edit;
          if (canEdit) {
            const stageFrame = yield createStageContainer(p, p.name || "Frame");
            try {
              const stagedP = __spreadProps(__spreadValues({}, p), { parentId: stageFrame.id, x: void 0, y: void 0 });
              const frame2 = figma.createFrame();
              frame2.name = p.name || "Frame";
              const { hints: setupHints } = yield setupFrameNode(frame2, stagedP);
              hints.push(...setupHints);
              if ((_c = p.children) == null ? void 0 : _c.length) {
                const textChildren = collectTextChildren(p.children);
                const textCtx = yield prepCreateText({ items: textChildren });
                yield createInlineChildren(frame2, null, p.children, hints, textCtx);
              }
              return { id: stageFrame.id, status: "staged", diff, correctedPayload, hints };
            } catch (e) {
              stageFrame.remove();
              throw e;
            }
          }
          return {
            error: `Ambiguous layout intent detected \u2014 review the diff and re-create with the corrected payload.`,
            diff,
            correctedPayload
          };
        }
      }
      const frame = figma.createFrame();
      try {
        frame.name = p.name || "Frame";
        const { hints: setupHints } = yield setupFrameNode(frame, p);
        hints.push(...setupHints);
        if ((_d = p.children) == null ? void 0 : _d.length) {
          const textChildren = collectTextChildren(p.children);
          const textCtx = yield prepCreateText({ items: textChildren });
          yield createInlineChildren(frame, null, p.children, hints, textCtx);
        }
        const result = { id: frame.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        frame.remove();
        throw e;
      }
    });
  }
  function createSingleAutoLayout(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g;
      if (p.padding !== void 0) {
        (_a = p.paddingTop) != null ? _a : p.paddingTop = p.padding;
        (_b = p.paddingRight) != null ? _b : p.paddingRight = p.padding;
        (_c = p.paddingBottom) != null ? _c : p.paddingBottom = p.padding;
        (_d = p.paddingLeft) != null ? _d : p.paddingLeft = p.padding;
      }
      if (((_e = p.nodeIds) == null ? void 0 : _e.length) && ((_f = p.children) == null ? void 0 : _f.length)) {
        throw new Error("Cannot use both nodeIds and children. Use nodeIds to wrap existing nodes, or children to create inline child nodes.");
      }
      if (!((_g = p.nodeIds) == null ? void 0 : _g.length)) {
        const _h = p, { nodeIds: _ } = _h, rest = __objRest(_h, ["nodeIds"]);
        return createSingleFrame(__spreadProps(__spreadValues({}, rest), {
          name: p.name || "Auto Layout",
          layoutMode: p.layoutMode || "VERTICAL"
        }));
      }
      const nodes = [];
      for (const id of p.nodeIds) {
        const node = yield figma.getNodeByIdAsync(id);
        if (!node) throw new Error(`Node not found: ${id}`);
        nodes.push(node);
      }
      const originalParent = nodes[0].parent || figma.currentPage;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        if ("x" in n && "y" in n && "width" in n && "height" in n) {
          const nx = n.x, ny = n.y, nw = n.width, nh = n.height;
          if (nx < minX) minX = nx;
          if (ny < minY) minY = ny;
          if (nx + nw > maxX) maxX = nx + nw;
          if (ny + nh > maxY) maxY = ny + nh;
        }
      }
      const frame = figma.createFrame();
      try {
        frame.name = p.name || "Auto Layout";
        frame.fills = [];
        if (minX !== Infinity) {
          frame.x = minX;
          frame.y = minY;
          frame.resize(maxX - minX, maxY - minY);
        }
        if ("appendChild" in originalParent) originalParent.appendChild(frame);
        for (const node of nodes) frame.appendChild(node);
        normalizeAliases(p, FRAME_ALIAS_KEYS);
        const hints = [];
        yield applyTokens(frame, { opacity: p.opacity }, hints);
        frame.layoutMode = p.layoutMode || "VERTICAL";
        for (const f of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
          if (p[f] === void 0) frame[f] = 0;
        }
        yield applyTokens(frame, {
          paddingTop: p.paddingTop,
          paddingRight: p.paddingRight,
          paddingBottom: p.paddingBottom,
          paddingLeft: p.paddingLeft,
          itemSpacing: p.itemSpacing
        }, hints);
        if (p.primaryAxisAlignItems) frame.primaryAxisAlignItems = p.primaryAxisAlignItems;
        if (p.counterAxisAlignItems) frame.counterAxisAlignItems = p.counterAxisAlignItems;
        applySizing(frame, originalParent, {
          layoutSizingHorizontal: p.layoutSizingHorizontal || "HUG",
          layoutSizingVertical: p.layoutSizingVertical || "HUG"
        }, hints);
        if (p.layoutWrap) frame.layoutWrap = p.layoutWrap;
        if (p.counterAxisSpacing !== void 0 && p.layoutWrap === "WRAP") {
          yield applyTokens(frame, { counterAxisSpacing: p.counterAxisSpacing }, hints);
        }
        const hasImageFill = yield applyImageFill(frame, p, hints);
        if (!hasImageFill) yield applyFillWithAutoBind(frame, p, hints);
        yield applyStrokeWithAutoBind(frame, p, hints);
        yield applyCornerRadius(frame, p, hints);
        const result = { id: frame.id };
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        for (const node of [...frame.children]) {
          originalParent.appendChild(node);
        }
        frame.remove();
        throw e;
      }
    });
  }
  var figmaHandlers17 = {
    create_frame: (p) => batchHandler(p, createSingleFrame, { keys: framesCreateFrame, help: 'frames(method: "help", topic: "create")' }),
    create_auto_layout: (p) => batchHandler(p, createSingleAutoLayout, { keys: framesCreateAutoLayout, help: 'frames(method: "help", topic: "create")' })
  };

  // src/handlers/fonts.ts
  function getAvailableFonts(params) {
    return __async(this, null, function* () {
      const fonts = yield figma.listAvailableFontsAsync();
      let result = fonts;
      if (params == null ? void 0 : params.query) {
        const q = params.query.toLowerCase();
        result = fonts.filter((f) => f.fontName.family.toLowerCase().includes(q));
      }
      const familyMap = {};
      for (const f of result) {
        const fam = f.fontName.family;
        if (!familyMap[fam]) familyMap[fam] = [];
        familyMap[fam].push(f.fontName.style);
      }
      let entries = Object.entries(familyMap);
      const total = entries.length;
      const offset = Number(params == null ? void 0 : params.offset) || 0;
      const limit = Number(params == null ? void 0 : params.limit) || 100;
      entries = entries.slice(offset, offset + limit);
      const includeStyles = (params == null ? void 0 : params.includeStyles) === true || (params == null ? void 0 : params.includeStyles) === "true";
      return {
        count: total,
        fonts: entries.map(([family, styles]) => __spreadValues({
          family
        }, includeStyles ? { styles } : {}))
      };
    });
  }
  var figmaHandlers18 = {
    get_available_fonts: getAvailableFonts
  };

  // src/handlers/styles.ts
  function ensureStyleId(id) {
    return id.startsWith("S:") && !id.endsWith(",") ? id + "," : id;
  }
  var TYPE_FILTER_MAP = {
    paint: "PAINT",
    text: "TEXT",
    effect: "EFFECT",
    grid: "GRID"
  };
  function rgbaToHex2(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a !== void 0 ? Math.round(color.a * 255) : 255;
    if (a === 255) return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    return `#${[r, g, b, a].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }
  function serializeStyle(style) {
    const r = { id: style.id, name: style.name, type: style.type };
    if (style.description) r.description = style.description;
    if (style.type === "PAINT") {
      const ps = style;
      r.paints = ps.paints.map((p) => {
        var _a;
        const paint = { type: p.type };
        if (p.visible !== void 0) paint.visible = p.visible;
        if (p.opacity !== void 0) paint.opacity = p.opacity;
        if (p.blendMode) paint.blendMode = p.blendMode;
        if (p.color) paint.color = rgbaToHex2(__spreadProps(__spreadValues({}, p.color), { a: (_a = p.opacity) != null ? _a : 1 }));
        return paint;
      });
      const bv = ps.boundVariables;
      if (bv) {
        for (const [, val] of Object.entries(bv)) {
          if (Array.isArray(val)) {
            for (const v of val) {
              if (v == null ? void 0 : v.id) {
                try {
                  const resolved = figma.variables.getVariableById(v.id);
                  if (resolved) r.colorVariableName = resolved.name;
                } catch (e) {
                }
              }
            }
          }
        }
      }
    } else if (style.type === "TEXT") {
      const ts = style;
      if (ts.fontName) {
        r.fontFamily = ts.fontName.family;
        r.fontStyle = ts.fontName.style;
      }
      r.fontSize = ts.fontSize;
      r.letterSpacing = ts.letterSpacing;
      r.lineHeight = ts.lineHeight;
      r.textCase = ts.textCase;
      r.textDecoration = ts.textDecoration;
      r.paragraphIndent = ts.paragraphIndent;
      r.paragraphSpacing = ts.paragraphSpacing;
      if ("leadingTrim" in ts) r.leadingTrim = ts.leadingTrim;
    } else if (style.type === "EFFECT") {
      r.effects = style.effects.map((e) => {
        const eff = { type: e.type, visible: e.visible };
        if (e.radius !== void 0) eff.radius = e.radius;
        if (e.color) eff.color = rgbaToHex2(e.color);
        if (e.offset) eff.offset = e.offset;
        if (e.spread !== void 0) eff.spread = e.spread;
        if (e.blendMode) eff.blendMode = e.blendMode;
        return eff;
      });
    } else if (style.type === "GRID") {
      r.layoutGrids = style.layoutGrids;
    }
    return r;
  }
  function listStylesFigma(params) {
    return __async(this, null, function* () {
      const typeFilter = params.type ? TYPE_FILTER_MAP[params.type] : null;
      const fetchers = [];
      if (!typeFilter || typeFilter === "PAINT") fetchers.push(figma.getLocalPaintStylesAsync());
      if (!typeFilter || typeFilter === "TEXT") fetchers.push(figma.getLocalTextStylesAsync());
      if (!typeFilter || typeFilter === "EFFECT") fetchers.push(figma.getLocalEffectStylesAsync());
      if (!typeFilter || typeFilter === "GRID") fetchers.push(figma.getLocalGridStylesAsync());
      const groups = yield Promise.all(fetchers);
      const allStyles = groups.flat();
      const paged = paginate(allStyles, params.offset, params.limit);
      const fields = params.fields;
      const items = paged.items.map((s) => {
        const full = serializeStyle(s);
        if (!(fields == null ? void 0 : fields.length)) return pickFields2(full, []);
        return pickFields2(full, fields);
      });
      return __spreadProps(__spreadValues({}, paged), { items });
    });
  }
  function getStyleByIdFigma(params) {
    return __async(this, null, function* () {
      const style = yield resolveAnyStyle(params.id);
      return serializeStyle(style);
    });
  }
  function removeStyleSingle(p) {
    return __async(this, null, function* () {
      const identifier = p.id || p.styleName;
      if (!identifier) throw new Error("Each item requires 'id' (accepts ID or name).");
      const style = yield resolveAnyStyle(identifier);
      style.remove();
      return "ok";
    });
  }
  function createPaintStyleSingle(p) {
    return __async(this, null, function* () {
      var _a;
      let c = p.color ? coerceColor(p.color) : null;
      let resolvedVariable = null;
      if (p.colorVariableName) {
        resolvedVariable = yield findColorVariableByName(p.colorVariableName);
        if (!resolvedVariable) {
          const colorVars = yield figma.variables.getLocalVariablesAsync("COLOR");
          const names = colorVars.map((v) => v.name).slice(0, 20);
          throw new Error(`colorVariableName '${p.colorVariableName}' not found. Available: [${names.join(", ")}]`);
        }
        if (!c) {
          const collection = yield figma.variables.getVariableCollectionByIdAsync(resolvedVariable.variableCollectionId);
          if (collection) {
            const modeId = collection.modes[0].modeId;
            const val = resolvedVariable.valuesByMode[modeId];
            if (val && typeof val === "object" && "r" in val) {
              c = { r: val.r, g: val.g, b: val.b, a: (_a = val.a) != null ? _a : 1 };
            }
          }
          if (!c) c = { r: 0, g: 0, b: 0, a: 1 };
        }
      }
      if (!c) throw new Error(`Paint style "${p.name}" requires either color or colorVariableName.`);
      const style = figma.createPaintStyle();
      try {
        style.name = p.name;
        if (p.description) style.description = p.description;
        style.paints = [{ type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: c.a }];
        const result = { id: style.id };
        if (resolvedVariable) {
          const bound = figma.variables.setBoundVariableForPaint(style.paints[0], "color", resolvedVariable);
          style.paints = [bound];
          result.boundVariable = resolvedVariable.name;
        } else {
          const match = yield suggestStyleForColor(c, "colorVariableName", "ALL_FILLS");
          if (match.variable) {
            const bound = figma.variables.setBoundVariableForPaint(style.paints[0], "color", match.variable);
            style.paints = [bound];
            result.boundVariable = match.variable.name;
          }
        }
        return result;
      } catch (e) {
        style.remove();
        throw e;
      }
    });
  }
  function createTextStyleSingle(p) {
    return __async(this, null, function* () {
      var _a, _b;
      const style = figma.createTextStyle();
      try {
        style.name = p.name;
        if (p.description) style.description = p.description;
        const fontStyle = (_b = (_a = p._resolvedFontStyle) != null ? _a : p.fontStyle) != null ? _b : "Regular";
        style.fontName = { family: p.fontFamily, style: fontStyle };
        style.fontSize = p.fontSize;
        if (p.lineHeight !== void 0) {
          if (typeof p.lineHeight === "number") style.lineHeight = { value: p.lineHeight, unit: "PIXELS" };
          else if (p.lineHeight.unit === "AUTO") style.lineHeight = { unit: "AUTO" };
          else style.lineHeight = { value: p.lineHeight.value, unit: p.lineHeight.unit };
        }
        if (p.letterSpacing !== void 0) {
          if (typeof p.letterSpacing === "number") style.letterSpacing = { value: p.letterSpacing, unit: "PIXELS" };
          else style.letterSpacing = { value: p.letterSpacing.value, unit: p.letterSpacing.unit };
        }
        if (p.textCase) style.textCase = p.textCase;
        if (p.textDecoration) style.textDecoration = p.textDecoration;
        if (p.paragraphIndent !== void 0) style.paragraphIndent = p.paragraphIndent;
        if (p.paragraphSpacing !== void 0) style.paragraphSpacing = p.paragraphSpacing;
        if (p.leadingTrim !== void 0) style.leadingTrim = p.leadingTrim;
        const result = { id: style.id };
        const hints = [];
        if (p.fontSize < 12) {
          hints.push({ type: "warn", message: "WCAG: Min 12px text recommended." });
        }
        if (p.lineHeight !== void 0 && p.lineHeight !== "AUTO") {
          if (typeof p.lineHeight === "number" && p.lineHeight < 10) {
            hints.push({ type: "warn", message: `lineHeight ${p.lineHeight}px looks wrong \u2014 did you mean {value: ${Math.round(p.lineHeight * 100)}, unit: "PERCENT"}? Bare numbers are pixels.` });
          }
          if (typeof p.lineHeight !== "number" && p.lineHeight.unit === "PERCENT" && p.lineHeight.value < 10) {
            hints.push({ type: "warn", message: `lineHeight ${p.lineHeight.value}% looks wrong \u2014 did you mean ${Math.round(p.lineHeight.value * 100)}%? PERCENT uses whole percentages (e.g. 150 = 1.5\xD7).` });
          }
        }
        if (hints.length > 0) result.hints = hints;
        return result;
      } catch (e) {
        style.remove();
        throw e;
      }
    });
  }
  function createEffectStyleSingle(p) {
    return __async(this, null, function* () {
      const effects = mapEffects(p.effects);
      const style = figma.createEffectStyle();
      try {
        style.name = p.name;
        if (p.description) style.description = p.description;
        style.effects = effects;
        return { id: style.id };
      } catch (e) {
        style.remove();
        throw e;
      }
    });
  }
  function mapLayoutGrids(grids) {
    return grids.map((g, i) => {
      var _a, _b, _c, _d;
      if (!g.pattern) throw new Error(`layoutGrids[${i}]: "pattern" is required (ROWS, COLUMNS, or GRID)`);
      const grid = { pattern: g.pattern, visible: (_a = g.visible) != null ? _a : true };
      if (g.color) {
        const c = coerceColor(g.color);
        if (c) grid.color = { r: c.r, g: c.g, b: c.b, a: c.a };
        else throw new Error(`layoutGrids[${i}]: invalid color "${g.color}"`);
      } else {
        grid.color = { r: 1, g: 0, b: 0, a: 0.1 };
      }
      if (g.pattern === "GRID") {
        grid.sectionSize = (_b = g.sectionSize) != null ? _b : 10;
      } else {
        const validAlignments = ["MIN", "MAX", "STRETCH", "CENTER"];
        if (g.alignment && !validAlignments.includes(g.alignment)) {
          throw new Error(`layoutGrids[${i}]: invalid alignment "${g.alignment}". Use: ${validAlignments.join(", ")}`);
        }
        grid.alignment = g.alignment || "STRETCH";
        grid.gutterSize = (_c = g.gutterSize) != null ? _c : 20;
        grid.count = (_d = g.count) != null ? _d : 12;
        if (g.sectionSize !== void 0) grid.sectionSize = g.sectionSize;
        if (g.offset !== void 0) grid.offset = g.offset;
      }
      return grid;
    });
  }
  function createGridStyleSingle(p) {
    return __async(this, null, function* () {
      const grids = mapLayoutGrids(p.layoutGrids);
      const style = figma.createGridStyle();
      try {
        style.name = p.name;
        if (p.description) style.description = p.description;
        style.layoutGrids = grids;
        return { id: style.id };
      } catch (e) {
        style.remove();
        throw e;
      }
    });
  }
  function mapEffects(effects) {
    return effects.map((e) => {
      var _a, _b, _c;
      const eff = { type: e.type, radius: e.radius, visible: (_a = e.visible) != null ? _a : true };
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") eff.blendMode = e.blendMode || "NORMAL";
      if (e.color) {
        const c = coerceColor(e.color);
        if (c) eff.color = c;
      }
      if (e.offset) eff.offset = { x: (_b = e.offset.x) != null ? _b : 0, y: (_c = e.offset.y) != null ? _c : 0 };
      if (e.spread !== void 0) eff.spread = e.spread;
      return eff;
    });
  }
  function resolveAnyStyle(idOrName) {
    return __async(this, null, function* () {
      const byId = yield figma.getStyleByIdAsync(ensureStyleId(idOrName));
      if (byId) return byId;
      const [paints, texts, effects, grids] = yield Promise.all([
        figma.getLocalPaintStylesAsync(),
        figma.getLocalTextStylesAsync(),
        figma.getLocalEffectStylesAsync(),
        figma.getLocalGridStylesAsync()
      ]);
      const all = [...paints, ...texts, ...effects, ...grids];
      const exact = all.find((s) => s.name === idOrName);
      if (exact) return exact;
      const fuzzy = all.find((s) => s.name.toLowerCase().includes(idOrName.toLowerCase()));
      if (fuzzy) return fuzzy;
      throw new Error(`Style not found: '${idOrName}'`);
    });
  }
  var PAINT_FIELDS = ["color", "colorVariableName"];
  var TEXT_FIELDS = ["fontFamily", "fontStyle", "fontSize", "lineHeight", "letterSpacing", "textCase", "textDecoration", "paragraphIndent", "paragraphSpacing", "leadingTrim"];
  var EFFECT_FIELDS = ["effects"];
  var GRID_FIELDS = ["layoutGrids"];
  var TYPE_FIELDS = { PAINT: PAINT_FIELDS, TEXT: TEXT_FIELDS, EFFECT: EFFECT_FIELDS, GRID: GRID_FIELDS };
  function patchStyleSingle(p) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      const identifier = p.id || p.styleName;
      if (!identifier) throw new Error("Each item requires 'id' (accepts ID or name).");
      const style = yield resolveAnyStyle(identifier);
      if (p.name !== void 0) style.name = p.name;
      if (p.description !== void 0) style.description = p.description;
      const applicable = TYPE_FIELDS[style.type] || [];
      const allTypeFields = [...PAINT_FIELDS, ...TEXT_FIELDS, ...EFFECT_FIELDS, ...GRID_FIELDS];
      const ignored = allTypeFields.filter((f) => p[f] !== void 0 && !applicable.includes(f));
      if (style.type === "PAINT") {
        const ps = style;
        if (p.color !== void 0 || p.colorVariableName !== void 0) {
          const c = p.color ? coerceColor(p.color) : null;
          ps.paints = [{ type: "SOLID", color: c ? { r: c.r, g: c.g, b: c.b } : (_b = (_a = ps.paints[0]) == null ? void 0 : _a.color) != null ? _b : { r: 0, g: 0, b: 0 }, opacity: (_c = c == null ? void 0 : c.a) != null ? _c : 1 }];
          if (p.colorVariableName) {
            const v = yield findColorVariableByName(p.colorVariableName);
            if (v) {
              const bound = figma.variables.setBoundVariableForPaint(ps.paints[0], "color", v);
              ps.paints = [bound];
            } else {
              const colorVars = yield figma.variables.getLocalVariablesAsync("COLOR");
              const names = colorVars.map((v2) => v2.name).slice(0, 20);
              throw new Error(`colorVariableName '${p.colorVariableName}' not found. Available: [${names.join(", ")}]`);
            }
          } else if (c) {
            const match = yield suggestStyleForColor(c, "colorVariableName", "ALL_FILLS");
            if (match.variable) {
              const bound = figma.variables.setBoundVariableForPaint(ps.paints[0], "color", match.variable);
              ps.paints = [bound];
            }
          }
        }
      } else if (style.type === "TEXT") {
        const ts = style;
        const newFamily = (_d = p.fontFamily) != null ? _d : ts.fontName.family;
        const newFontStyle = (_e = p.fontStyle) != null ? _e : ts.fontName.style;
        if (p.fontFamily !== void 0 || p.fontStyle !== void 0) {
          ts.fontName = { family: newFamily, style: newFontStyle };
        }
        if (p.fontSize !== void 0) ts.fontSize = p.fontSize;
        if (p.lineHeight !== void 0) {
          if (typeof p.lineHeight === "number") ts.lineHeight = { value: p.lineHeight, unit: "PIXELS" };
          else if (p.lineHeight.unit === "AUTO") ts.lineHeight = { unit: "AUTO" };
          else ts.lineHeight = { value: p.lineHeight.value, unit: p.lineHeight.unit };
        }
        if (p.letterSpacing !== void 0) {
          if (typeof p.letterSpacing === "number") ts.letterSpacing = { value: p.letterSpacing, unit: "PIXELS" };
          else ts.letterSpacing = { value: p.letterSpacing.value, unit: p.letterSpacing.unit };
        }
        if (p.textCase !== void 0) ts.textCase = p.textCase;
        if (p.textDecoration !== void 0) ts.textDecoration = p.textDecoration;
        if (p.paragraphIndent !== void 0) ts.paragraphIndent = p.paragraphIndent;
        if (p.paragraphSpacing !== void 0) ts.paragraphSpacing = p.paragraphSpacing;
        if (p.leadingTrim !== void 0) ts.leadingTrim = p.leadingTrim;
      } else if (style.type === "EFFECT") {
        const es = style;
        if (p.effects !== void 0) {
          es.effects = mapEffects(p.effects);
        }
      } else if (style.type === "GRID") {
        const gs = style;
        if (p.layoutGrids !== void 0) gs.layoutGrids = p.layoutGrids;
      }
      const hints = [];
      if (ignored.length > 0) {
        hints.push({ type: "warn", message: `${ignored.join(", ")} not applicable for ${style.type} style, ignored.` });
      }
      if (style.type === "TEXT") {
        const ts = style;
        if (ts.fontSize < 12) hints.push({ type: "warn", message: "WCAG: Min 12px text recommended." });
        if (p.lineHeight !== void 0 && typeof p.lineHeight === "number" && p.lineHeight < 10) {
          hints.push({ type: "warn", message: `lineHeight ${p.lineHeight}px looks wrong \u2014 did you mean {value: ${Math.round(p.lineHeight * 100)}, unit: "PERCENT"}? Bare numbers are pixels.` });
        }
        const lh = ts.lineHeight;
        if (lh && lh.unit === "PERCENT" && lh.value < 10) {
          hints.push({ type: "warn", message: `lineHeight ${lh.value}% looks wrong \u2014 did you mean ${Math.round(lh.value * 100)}%? PERCENT uses whole percentages (e.g. 150 = 1.5\xD7).` });
        }
      }
      if (hints.length > 0) return { hints };
      return "ok";
    });
  }
  function createTextStyleBatch(params) {
    return __async(this, null, function* () {
      clearFontCache();
      const items = params.items || [params];
      const resolved = /* @__PURE__ */ new Map();
      for (const p of items) {
        const family = p.fontFamily;
        const style = p.fontStyle || "Regular";
        const key = `${family}::${style}`;
        if (!resolved.has(key)) {
          const font = yield resolveFontAsync(family, style);
          resolved.set(key, font.style);
        }
        p._resolvedFontStyle = resolved.get(key);
      }
      return batchHandler(params, createTextStyleSingle, { keys: stylesCreateText, help: 'styles(method: "help", topic: "create")' });
    });
  }
  function patchStylesBatch(params) {
    return __async(this, null, function* () {
      var _a, _b;
      clearFontCache();
      const items = params.items || [params];
      for (const p of items) {
        try {
          const style = yield resolveAnyStyle(p.id || p.styleName);
          if (style.type === "TEXT") {
            const ts = style;
            const family = (_a = p.fontFamily) != null ? _a : ts.fontName.family;
            const fontStyle = (_b = p.fontStyle) != null ? _b : ts.fontName.style;
            const resolved = yield resolveFontAsync(family, fontStyle);
            if (p.fontFamily !== void 0 || p.fontStyle !== void 0) {
              if (p.fontFamily !== void 0) p.fontFamily = resolved.family;
              p.fontStyle = resolved.style;
            }
          }
        } catch (e) {
        }
      }
      return batchHandler(params, patchStyleSingle, { keys: stylesUpdate, help: 'styles(method: "help", topic: "update")' });
    });
  }
  var figmaHandlers19 = {
    styles: createDispatcher({
      create: (p) => {
        switch (p.type) {
          case "paint":
            return batchHandler(p, createPaintStyleSingle, { keys: stylesCreatePaint, help: 'styles(method: "help", topic: "create")' });
          case "text":
            return createTextStyleBatch(p);
          case "effect":
            return batchHandler(p, createEffectStyleSingle, { keys: stylesCreateEffect, help: 'styles(method: "help", topic: "create")' });
          case "grid":
            return batchHandler(p, createGridStyleSingle, { keys: stylesCreateGrid, help: 'styles(method: "help", topic: "create")' });
          default:
            throw new Error(`create requires type: "paint", "text", "effect", or "grid"`);
        }
      },
      get: (p) => getStyleByIdFigma(p),
      list: (p) => listStylesFigma(p),
      update: (p) => patchStylesBatch(p),
      delete: (p) => batchHandler(p, removeStyleSingle, { keys: stylesDelete, help: 'styles(method: "help", topic: "delete")' })
    })
  };

  // src/handlers/variables.ts
  init_color();
  var VALID_SCOPES = /* @__PURE__ */ new Set([
    "ALL_SCOPES",
    "TEXT_CONTENT",
    "WIDTH_HEIGHT",
    "GAP",
    "CORNER_RADIUS",
    "ALL_FILLS",
    "FRAME_FILL",
    "SHAPE_FILL",
    "TEXT_FILL",
    "STROKE_COLOR",
    "STROKE_FLOAT",
    "EFFECT_FLOAT",
    "EFFECT_COLOR",
    "OPACITY",
    "FONT_FAMILY",
    "FONT_STYLE",
    "FONT_WEIGHT",
    "FONT_SIZE",
    "LINE_HEIGHT",
    "LETTER_SPACING",
    "PARAGRAPH_SPACING",
    "PARAGRAPH_INDENT",
    "TRANSFORM"
  ]);
  function applyScopes(variable, scopes, hints) {
    const invalid = scopes.filter((s) => !VALID_SCOPES.has(s));
    if (invalid.length > 0) {
      hints.push({
        type: "warn",
        message: `Invalid scope(s): [${invalid.join(", ")}] \u2014 coerced to ALL_SCOPES. Valid: [${[...VALID_SCOPES].join(", ")}]. Fix: variables(method:"update", items:[{name:"${variable.name}", scopes:[...]}])`
      });
      variable.scopes = ["ALL_SCOPES"];
      return;
    }
    try {
      variable.scopes = scopes;
    } catch (e) {
      hints.push({ type: "error", message: `in set_scopes: ${e.message}` });
    }
  }
  function findCollection(idOrName) {
    return __async(this, null, function* () {
      if (!idOrName) return null;
      const direct = yield figma.variables.getVariableCollectionByIdAsync(idOrName);
      if (direct) return direct;
      const all = yield figma.variables.getLocalVariableCollectionsAsync();
      return all.find((c) => c.id === idOrName) || all.find((c) => c.name === idOrName) || all.find((c) => c.name.toLowerCase() === idOrName.toLowerCase()) || null;
    });
  }
  function resolveModeId(collection, modeIdOrName) {
    return __async(this, null, function* () {
      if (collection.modes.some((m) => m.modeId === modeIdOrName)) return modeIdOrName;
      const byName = collection.modes.find(
        (m) => m.name === modeIdOrName || m.name.toLowerCase() === modeIdOrName.toLowerCase()
      );
      if (byName) return byName.modeId;
      const available = collection.modes.map((m) => `${m.name} (${m.modeId})`).join(", ");
      throw new Error(`Mode "${modeIdOrName}" not found in collection "${collection.name}". Available: ${available}`);
    });
  }
  function coerceVariableValue(value) {
    return __async(this, null, function* () {
      if (typeof value === "object" && value !== null && value.type === "VARIABLE_ALIAS") {
        const aliasVar = value.name ? yield findVariableByName(value.name) : value.id ? yield findVariableById(value.id) : null;
        if (!aliasVar) throw new Error(`Alias variable not found: ${value.name || value.id}`);
        return yield figma.variables.createVariableAliasByIdAsync(aliasVar.id);
      }
      const asColor = coerceColor(value);
      return asColor != null ? asColor : value;
    });
  }
  function serializeVariable(v) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const col = yield findCollection(v.variableCollectionId);
      const modeMap = new Map(
        ((_a = col == null ? void 0 : col.modes) != null ? _a : []).map((m) => [m.modeId, m.name])
      );
      const valuesByMode = {};
      for (const [modeId, rawValue] of Object.entries(v.valuesByMode)) {
        let value = rawValue;
        if (value && typeof value === "object" && value.type === "VARIABLE_ALIAS" && value.id) {
          const aliasVar = yield findVariableById(value.id);
          value = { type: "VARIABLE_ALIAS", name: (_b = aliasVar == null ? void 0 : aliasVar.name) != null ? _b : value.id };
        }
        if (value && typeof value === "object" && !value.type && "r" in value) {
          value = rgbaToHex(value);
        }
        valuesByMode[(_c = modeMap.get(modeId)) != null ? _c : modeId] = value;
      }
      const result = {
        name: v.name,
        type: v.resolvedType,
        valuesByMode,
        scopes: v.scopes
      };
      if (v.description) result.description = v.description;
      return result;
    });
  }
  function serializeCollectionFull(c) {
    return __async(this, null, function* () {
      const modes = c.modes.map((m) => m.name);
      const allVars = yield figma.variables.getLocalVariablesAsync();
      const colVars = allVars.filter((v) => v.variableCollectionId === c.id);
      const variables = [];
      for (const v of colVars) {
        variables.push(yield serializeVariable(v));
      }
      return { id: c.id, name: c.name, modes, variables };
    });
  }
  function serializeCollectionStub(c, varCount) {
    return {
      id: c.id,
      name: c.name,
      modes: c.modes.map((m) => m.name),
      variableCount: varCount
    };
  }
  function createCollectionSingle(p) {
    return __async(this, null, function* () {
      var _a, _b;
      const collection = figma.variables.createVariableCollection(p.name);
      const hints = [];
      if ((_a = p.modes) == null ? void 0 : _a.length) {
        collection.renameMode(collection.defaultModeId, p.modes[0]);
        for (let i = 1; i < p.modes.length; i++) {
          collection.addMode(p.modes[i]);
        }
      }
      if ((_b = p.variables) == null ? void 0 : _b.length) {
        const modeMap = new Map(
          collection.modes.map((m) => [m.name, m.modeId])
        );
        for (const vDef of p.variables) {
          const resolvedType = vDef.type || vDef.resolvedType;
          if (!vDef.name || !resolvedType) {
            hints.push({ type: "error", message: `Variable missing name or type: ${JSON.stringify(vDef)}` });
            continue;
          }
          let variable;
          try {
            variable = figma.variables.createVariable(vDef.name, collection, resolvedType);
          } catch (e) {
            hints.push({ type: "error", message: `Failed to create variable "${vDef.name}": ${e.message}` });
            continue;
          }
          const refetched = yield figma.variables.getVariableByIdAsync(variable.id);
          if (!refetched) {
            hints.push({ type: "error", message: `Failed to re-fetch created variable: ${vDef.name}` });
            continue;
          }
          if (vDef.description !== void 0) refetched.description = vDef.description;
          const valuesToSet = {};
          if (vDef.valuesByMode && typeof vDef.valuesByMode === "object") {
            Object.assign(valuesToSet, vDef.valuesByMode);
          } else if (vDef.value !== void 0) {
            for (const mode of collection.modes) {
              valuesToSet[mode.name] = vDef.value;
            }
          }
          for (const [modeName, rawValue] of Object.entries(valuesToSet)) {
            const modeId = modeMap.get(modeName);
            if (!modeId) {
              hints.push({ type: "error", message: `Mode "${modeName}" not found for variable "${vDef.name}". Available: [${[...modeMap.keys()].join(", ")}]` });
              continue;
            }
            try {
              const coerced = yield coerceVariableValue(rawValue);
              refetched.setValueForMode(modeId, coerced);
            } catch (e) {
              hints.push({ type: "error", message: `Failed to set "${vDef.name}" for mode "${modeName}": ${e.message}` });
            }
          }
          if (vDef.scopes !== void 0) {
            applyScopes(refetched, vDef.scopes, hints);
          }
        }
      }
      const result = { id: collection.id };
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function getCollectionFigma(params) {
    return __async(this, null, function* () {
      const c = yield findCollection(params.id);
      if (!c) throw new Error(`Collection not found: ${params.id}`);
      return yield serializeCollectionFull(c);
    });
  }
  function listCollectionsFigma(params) {
    return __async(this, null, function* () {
      const collections = yield figma.variables.getLocalVariableCollectionsAsync();
      const allVars = yield figma.variables.getLocalVariablesAsync();
      const paged = paginate(collections, params.offset, params.limit);
      const fields = params.fields;
      const items = [];
      for (const c of paged.items) {
        const varCount = allVars.filter((v) => v.variableCollectionId === c.id).length;
        const stub = serializeCollectionStub(c, varCount);
        items.push(!(fields == null ? void 0 : fields.length) ? stub : pickFields2(stub, fields));
      }
      return __spreadProps(__spreadValues({}, paged), { items });
    });
  }
  function deleteCollectionSingle(p) {
    return __async(this, null, function* () {
      const c = yield findCollection(p.id);
      if (!c) throw new Error(`Collection not found: ${p.id}`);
      c.remove();
      return {};
    });
  }
  function addModeSingle(p) {
    return __async(this, null, function* () {
      const c = yield findCollection(p.collectionId);
      if (!c) throw new Error(`Collection not found: ${p.collectionId}`);
      const modeId = c.addMode(p.name);
      return { modeId };
    });
  }
  function renameModeSingle(p) {
    return __async(this, null, function* () {
      const c = yield findCollection(p.collectionId);
      if (!c) throw new Error(`Collection not found: ${p.collectionId}`);
      const modeId = yield resolveModeId(c, p.modeId);
      c.renameMode(modeId, p.name);
      return {};
    });
  }
  function removeModeSingle(p) {
    return __async(this, null, function* () {
      const c = yield findCollection(p.collectionId);
      if (!c) throw new Error(`Collection not found: ${p.collectionId}`);
      const modeId = yield resolveModeId(c, p.modeId);
      c.removeMode(modeId);
      return {};
    });
  }
  function renameCollectionSingle(p) {
    return __async(this, null, function* () {
      const c = yield findCollection(p.id);
      if (!c) throw new Error(`Collection not found: ${p.id}`);
      if (p.name !== void 0) c.name = p.name;
      return {};
    });
  }
  function requireCollection(p) {
    return __async(this, null, function* () {
      const id = p.collectionId;
      if (!id) throw new Error("collectionId is required. Pass the collection name or ID.");
      const c = yield findCollection(id);
      if (!c) throw new Error(`Collection not found: ${id}`);
      return c;
    });
  }
  function createVariableSingle(p, collection) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const resolvedType = p.type || p.resolvedType;
      if (!resolvedType) throw new Error(`Variable "${p.name}" missing type.`);
      let created;
      try {
        created = figma.variables.createVariable(p.name, collection, resolvedType);
      } catch (e) {
        if (((_a = e.message) == null ? void 0 : _a.includes("duplicate")) || ((_b = e.message) == null ? void 0 : _b.includes("already exists"))) {
          throw new Error(`Variable "${p.name}" already exists in collection "${collection.name}". Use variables(method: "update") to change values.`);
        }
        throw e;
      }
      const variable = yield figma.variables.getVariableByIdAsync(created.id);
      if (!variable) throw new Error(`Failed to re-fetch created variable: ${p.name}`);
      if (p.description !== void 0) variable.description = p.description;
      const hints = [];
      const valuesToSet = {};
      if (p.valuesByMode && typeof p.valuesByMode === "object") {
        Object.assign(valuesToSet, p.valuesByMode);
      } else if (p.value !== void 0) {
        for (const mode of collection.modes) {
          valuesToSet[mode.name] = p.value;
        }
      }
      const modeMap = new Map(
        collection.modes.map((m) => [m.name, m.modeId])
      );
      for (const [modeName, rawValue] of Object.entries(valuesToSet)) {
        const modeId = (_c = modeMap.get(modeName)) != null ? _c : yield resolveModeId(collection, modeName).catch(() => null);
        if (!modeId) {
          hints.push({ type: "error", message: `Mode "${modeName}" not found. Available: [${[...modeMap.keys()].join(", ")}]` });
          continue;
        }
        const coerced = yield coerceVariableValue(rawValue);
        variable.setValueForMode(modeId, coerced);
      }
      if (p.scopes !== void 0) {
        applyScopes(variable, p.scopes, hints);
      }
      const resolvedValues = {};
      for (const mode of collection.modes) {
        const val = variable.valuesByMode[mode.modeId];
        if (val && typeof val === "object" && "r" in val) {
          resolvedValues[mode.name] = rgbaToHex(val);
        } else if (val !== void 0) {
          resolvedValues[mode.name] = val;
        }
      }
      if (resolvedType === "COLOR") {
        const existing = yield figma.variables.getLocalVariablesAsync("COLOR");
        const siblings = existing.filter((v) => v.variableCollectionId === collection.id && v.id !== variable.id);
        for (const mode of collection.modes) {
          const newVal = variable.valuesByMode[mode.modeId];
          if (!newVal || typeof newVal !== "object" || !("r" in newVal)) continue;
          const newHex = rgbaToHex(newVal);
          for (const sib of siblings) {
            const sibVal = sib.valuesByMode[mode.modeId];
            if (!sibVal || typeof sibVal !== "object" || !("r" in sibVal)) continue;
            if (rgbaToHex(sibVal) === newHex) {
              hints.push({
                type: "warn",
                message: `"${variable.name}" has the same ${mode.name} value (${newHex}) as existing variable "${sib.name}". If they should stay in sync, bind as alias: variables(method:"update", collectionId:"${collection.name}", items:[{name:"${variable.name}", valuesByMode:{"${mode.name}":{type:"VARIABLE_ALIAS", name:"${sib.name}"}}}])`
              });
              break;
            }
          }
        }
      }
      const result = { name: variable.name, resolvedValues };
      if (hints.length > 0) result.hints = hints;
      return result;
    });
  }
  function getVariableFigma(params) {
    return __async(this, null, function* () {
      const collection = yield requireCollection(params);
      const v = yield findVariableByName(params.name, collection.name);
      if (!v) throw new Error(`Variable not found: ${params.name} in collection "${collection.name}"`);
      const result = yield serializeVariable(v);
      result.collectionId = collection.name;
      return result;
    });
  }
  function listVariablesFigma(params) {
    return __async(this, null, function* () {
      const collection = yield requireCollection(params);
      let variables = (params == null ? void 0 : params.type) ? yield figma.variables.getLocalVariablesAsync(params.type) : yield figma.variables.getLocalVariablesAsync();
      variables = variables.filter((v) => v.variableCollectionId === collection.id);
      if (params.query) {
        const q = params.query.toLowerCase();
        const prefixMatches = variables.filter((v) => v.name.toLowerCase().startsWith(q));
        if (prefixMatches.length > 0) {
          variables = prefixMatches;
        } else {
          variables = variables.filter((v) => v.name.toLowerCase().includes(q));
        }
      }
      const paged = paginate(variables, params.offset, params.limit);
      const fields = params.fields;
      const items = [];
      for (const v of paged.items) {
        const full = yield serializeVariable(v);
        items.push(!(fields == null ? void 0 : fields.length) ? pickFields2(full, ["valuesByMode", "scopes", "description"]) : pickFields2(full, fields));
      }
      return __spreadProps(__spreadValues({}, paged), { items });
    });
  }
  function updateVariableSingle(p, collection) {
    return __async(this, null, function* () {
      var _a, _b;
      const variable = yield findVariableByName(p.name, collection.name);
      if (!variable) throw new Error(`Variable not found: ${p.name} in collection "${collection.name}"`);
      const hints = [];
      if (p.rename !== void 0) variable.name = p.rename;
      if (p.description !== void 0) variable.description = p.description;
      if (p.scopes !== void 0) applyScopes(variable, p.scopes, hints);
      const valuesToSet = {};
      if (p.valuesByMode && typeof p.valuesByMode === "object") {
        Object.assign(valuesToSet, p.valuesByMode);
      } else if (p.value !== void 0) {
        const defaultModeName = (_a = collection.modes[0]) == null ? void 0 : _a.name;
        if (defaultModeName) valuesToSet[defaultModeName] = p.value;
      }
      if (Object.keys(valuesToSet).length > 0) {
        const modeMap = new Map(
          collection.modes.map((m) => [m.name, m.modeId])
        );
        for (const [modeName, rawValue] of Object.entries(valuesToSet)) {
          const modeId = (_b = modeMap.get(modeName)) != null ? _b : yield resolveModeId(collection, modeName);
          const coerced = yield coerceVariableValue(rawValue);
          variable.setValueForMode(modeId, coerced);
        }
      }
      if (hints.length > 0) return { hints };
      return {};
    });
  }
  function deleteVariableSingle(p, collection) {
    return __async(this, null, function* () {
      const variable = yield findVariableByName(p.name, collection.name);
      if (!variable) throw new Error(`Variable not found: ${p.name} in collection "${collection.name}"`);
      variable.remove();
      return {};
    });
  }
  function setBindingSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      const variable = p.variableName ? yield findVariableByName(p.variableName) : yield findVariableById(p.variableId);
      if (!variable) throw new Error(`Variable not found: ${p.variableName || p.variableId}`);
      const paintMatch = p.field.match(/^(fills|strokes)\/(\d+)\/color$/);
      if (paintMatch) {
        const prop = paintMatch[1];
        const index = parseInt(paintMatch[2], 10);
        if (!(prop in node)) throw new Error(`Node does not have ${prop}`);
        const paints = node[prop].slice();
        while (index >= paints.length) {
          paints.push({ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 });
        }
        const newPaint = figma.variables.setBoundVariableForPaint(paints[index], "color", variable);
        paints[index] = newPaint;
        node[prop] = paints;
      } else if ("setBoundVariable" in node) {
        node.setBoundVariable(p.field, variable);
      } else {
        throw new Error("Node does not support variable binding");
      }
      return {};
    });
  }
  function setExplicitModeSingle(p) {
    return __async(this, null, function* () {
      const node = yield figma.getNodeByIdAsync(p.nodeId);
      if (!node) throw new Error(`Node not found: ${p.nodeId}`);
      if (!("setExplicitVariableModeForCollection" in node)) throw new Error(`Node ${p.nodeId} (${node.type}) does not support explicit variable modes. Use a FRAME, COMPONENT, COMPONENT_SET, or SLOT.`);
      const collection = yield findCollection(p.collectionId);
      if (!collection) throw new Error(`Collection not found: ${p.collectionId}`);
      try {
        node.setExplicitVariableModeForCollection(collection, p.modeId);
      } catch (e) {
        throw new Error(`Failed to set mode '${p.modeId}' on node ${p.nodeId}: ${e.message}. Ensure the modeId is valid for collection '${collection.name}'.`);
      }
      return {};
    });
  }
  function getNodeVariablesFigma(params) {
    return __async(this, null, function* () {
      var _a, _b;
      const node = yield figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const result = { nodeId: params.nodeId };
      if ("boundVariables" in node) {
        const bv = node.boundVariables;
        if (bv && typeof bv === "object") {
          const bindings = {};
          for (const [key, val] of Object.entries(bv)) {
            if (Array.isArray(val)) {
              const resolved = [];
              for (const v of val) {
                if (v == null ? void 0 : v.id) {
                  const variable = yield findVariableById(v.id);
                  resolved.push({ variableName: (_a = variable == null ? void 0 : variable.name) != null ? _a : v.id, field: v.field });
                } else {
                  resolved.push(v);
                }
              }
              bindings[key] = resolved;
            } else if (val && typeof val === "object" && val.id) {
              const variable = yield findVariableById(val.id);
              bindings[key] = { variableName: (_b = variable == null ? void 0 : variable.name) != null ? _b : val.id, field: val.field };
            }
          }
          result.boundVariables = bindings;
        }
      }
      if ("explicitVariableModes" in node) {
        result.explicitVariableModes = node.explicitVariableModes;
      }
      return result;
    });
  }
  var figmaHandlers20 = {
    variable_collections: createDispatcher({
      create: (p) => batchHandler(p, createCollectionSingle, { keys: variableCollectionsCreate, help: 'variable_collections(method: "help", topic: "create")' }),
      get: getCollectionFigma,
      list: listCollectionsFigma,
      update: (p) => batchHandler(p, renameCollectionSingle, { keys: variableCollectionsUpdate, help: 'variable_collections(method: "help", topic: "update")' }),
      delete: (p) => {
        if (p.id && !p.items) {
          p.items = [{ id: p.id }];
        }
        return batchHandler(p, deleteCollectionSingle, { keys: variableCollectionsDelete, help: 'variable_collections(method: "help", topic: "delete")' });
      },
      add_mode: (p) => batchHandler(p, addModeSingle, { keys: variableCollectionsAddMode, help: 'variable_collections(method: "help", topic: "add_mode")' }),
      rename_mode: (p) => batchHandler(p, renameModeSingle, { keys: variableCollectionsRenameMode, help: 'variable_collections(method: "help", topic: "rename_mode")' }),
      remove_mode: (p) => batchHandler(p, removeModeSingle, { keys: variableCollectionsRemoveMode, help: 'variable_collections(method: "help", topic: "remove_mode")' })
    }),
    variables: createDispatcher({
      create: (p) => __async(null, null, function* () {
        const collection = yield requireCollection(p);
        return batchHandler(p, (item) => createVariableSingle(item, collection), { keys: variablesCreate, help: 'variables(method: "help", topic: "create")' });
      }),
      get: getVariableFigma,
      list: listVariablesFigma,
      update: (p) => __async(null, null, function* () {
        const collection = yield requireCollection(p);
        return batchHandler(p, (item) => updateVariableSingle(item, collection), { keys: variablesUpdate, help: 'variables(method: "help", topic: "update")' });
      }),
      delete: (p) => __async(null, null, function* () {
        const collection = yield requireCollection(p);
        if (p.name && !p.items) {
          p.items = [{ name: p.name }];
        }
        return batchHandler(p, (item) => deleteVariableSingle(item, collection), { keys: variablesDelete, help: 'variables(method: "help", topic: "delete")' });
      })
    }),
    set_variable_binding: (p) => batchHandler(p, setBindingSingle),
    set_explicit_variable_mode: (p) => batchHandler(p, setExplicitModeSingle),
    get_node_variables: getNodeVariablesFigma
  };

  // src/handlers/version-history.ts
  function saveVersionHistory(params) {
    return __async(this, null, function* () {
      var _a;
      if (!(params == null ? void 0 : params.title)) throw new Error("Missing required parameter: title");
      const title = params.title;
      const description = params.description || "";
      const result = yield figma.saveVersionHistoryAsync(title, description);
      return {
        id: typeof result === "string" ? result : (_a = result == null ? void 0 : result.id) != null ? _a : JSON.stringify(result)
      };
    });
  }
  var figmaHandlers21 = {
    save_version_history: saveVersionHistory
  };

  // src/handlers/prototyping.ts
  var DIRECTIONAL_TRANSITIONS = /* @__PURE__ */ new Set(["MOVE_IN", "MOVE_OUT", "PUSH", "SLIDE_IN", "SLIDE_OUT"]);
  function buildTrigger(type, p) {
    var _a, _b, _c;
    switch (type) {
      case "ON_CLICK":
      case "ON_HOVER":
      case "ON_PRESS":
      case "ON_DRAG":
        return { type };
      case "AFTER_TIMEOUT":
        return { type, timeout: ((_a = p.triggerDelay) != null ? _a : 800) / 1e3 };
      case "MOUSE_ENTER":
      case "MOUSE_LEAVE":
        return { type, delay: (_b = p.triggerDelay) != null ? _b : 0 };
      case "MOUSE_UP":
      case "MOUSE_DOWN":
        return { type, delay: (_c = p.triggerDelay) != null ? _c : 0 };
      case "ON_KEY_DOWN":
        return {
          type,
          device: p.triggerDevice || "KEYBOARD",
          keyCodes: p.triggerKeyCodes || []
        };
      default:
        return { type };
    }
  }
  function buildTransition(type, direction, duration, easing) {
    if (type === "INSTANT") return null;
    const transType = type || "DISSOLVE";
    const easingObj = { type: easing || "EASE_OUT" };
    const dur = duration != null ? duration : 0.3;
    if (DIRECTIONAL_TRANSITIONS.has(transType)) {
      return {
        type: transType,
        direction: direction || "LEFT",
        matchLayers: transType === "SMART_ANIMATE",
        easing: easingObj,
        duration: dur
      };
    }
    return {
      type: transType,
      easing: easingObj,
      duration: dur
    };
  }
  function resolveCollectionAndMode(collectionName, modeName) {
    return __async(this, null, function* () {
      const collections = yield figma.variables.getLocalVariableCollectionsAsync();
      const cName = collectionName.toLowerCase();
      const col = collections.find((c) => c.name.toLowerCase() === cName);
      if (!col) throw new Error(`Collection not found: "${collectionName}". Available: ${collections.map((c) => c.name).join(", ")}`);
      const mName = modeName.toLowerCase();
      const mode = col.modes.find((m) => m.name.toLowerCase() === mName);
      if (!mode) throw new Error(`Mode not found: "${modeName}" in "${col.name}". Available: ${col.modes.map((m) => m.name).join(", ")}`);
      return { collectionId: col.id, modeId: mode.modeId };
    });
  }
  function buildAction(a) {
    return __async(this, null, function* () {
      var _a;
      const actionType = a.actionType || a.type || "NODE";
      if (actionType === "BACK") return { type: "BACK" };
      if (actionType === "CLOSE") return { type: "CLOSE" };
      if (actionType === "URL") {
        if (!a.url) throw new Error("url is required for URL action");
        return { type: "URL", url: a.url };
      }
      if (actionType === "SET_VARIABLE_MODE") {
        if (!a.collectionName || !a.modeName) throw new Error("collectionName and modeName are required for SET_VARIABLE_MODE");
        const { collectionId, modeId } = yield resolveCollectionAndMode(a.collectionName, a.modeName);
        return { type: "SET_VARIABLE_MODE", variableCollectionId: collectionId, variableModeId: modeId };
      }
      if (!a.destination) throw new Error("destination (node ID) is required for NODE action");
      const nav = a.navigation || "NAVIGATE";
      const destNode = yield figma.getNodeByIdAsync(a.destination);
      if (!destNode) throw new Error(`Destination node not found: ${a.destination}`);
      if (nav === "CHANGE_TO") {
        if (destNode.type !== "COMPONENT" || !destNode.parent || destNode.parent.type !== "COMPONENT_SET") {
          throw new Error(
            `CHANGE_TO destination "${destNode.name}" (${a.destination}) must be a variant (COMPONENT inside a COMPONENT_SET). Got ${destNode.type}${destNode.parent ? ` inside ${destNode.parent.type}` : ""}.`
          );
        }
      } else {
        if (!destNode.parent || destNode.parent.type !== "PAGE") {
          const parentDesc = destNode.parent ? `inside "${destNode.parent.name}" (${destNode.parent.type})` : "with no parent";
          const pageId = destNode.parent ? (() => {
            let p = destNode;
            while (p && p.type !== "PAGE") p = p.parent;
            return p == null ? void 0 : p.id;
          })() : null;
          const fix = pageId ? ` Quick fix: frames(method:"clone", id:"${a.destination}", parentId:"${pageId}", name:"${destNode.name}")` : "";
          throw new Error(`Destination "${destNode.name}" (${a.destination}) is not a top-level frame \u2014 it is nested ${parentDesc}. Prototype navigation requires the destination to be a direct child of a page.${fix}`);
        }
        if (a._sourcePageId && destNode.parent.id !== a._sourcePageId) {
          throw new Error(
            `Destination "${destNode.name}" (${a.destination}) is on page "${destNode.parent.name}" but the source node is on a different page. Prototype interactions only work within the same page. Quick fix: frames(method:"clone", id:"${a.destination}", parentId:"${a._sourcePageId}", name:"${destNode.name}")`
          );
        }
      }
      return {
        type: "NODE",
        destinationId: a.destination,
        navigation: nav,
        transition: buildTransition(a.transition, a.transitionDirection, a.duration, a.easing),
        resetScrollPosition: (_a = a.resetScrollPosition) != null ? _a : true
      };
    });
  }
  function buildReaction(p) {
    return __async(this, null, function* () {
      const trigger = buildTrigger(p.trigger, p);
      if (Array.isArray(p.actions)) {
        const actions = [];
        for (const a of p.actions) {
          if (p._sourcePageId) a._sourcePageId = p._sourcePageId;
          actions.push(yield buildAction(a));
        }
        return { trigger, action: actions[0], actions };
      }
      const action = yield buildAction(p);
      return { trigger, action, actions: [action] };
    });
  }
  function serializeAction(a) {
    const act = { type: a.type };
    if (a.destinationId) act.destinationId = a.destinationId;
    if (a.navigation) act.navigation = a.navigation;
    if (a.transition) {
      const t = { type: a.transition.type };
      if (a.transition.duration !== void 0) t.duration = a.transition.duration;
      if (a.transition.easing) t.easing = a.transition.easing.type || a.transition.easing;
      if (a.transition.direction) t.direction = a.transition.direction;
      if (a.transition.matchLayers) t.matchLayers = true;
      act.transition = t;
    }
    if (a.url) act.url = a.url;
    if (a.variableCollectionId) act.variableCollectionId = a.variableCollectionId;
    if (a.variableModeId) act.variableModeId = a.variableModeId;
    if (a.variableId) act.variableId = a.variableId;
    if (a.variableValue !== void 0) act.variableValue = a.variableValue;
    if (a.resetScrollPosition === false) act.resetScrollPosition = false;
    if (a.overlayPositionType) act.overlayPositionType = a.overlayPositionType;
    if (a.overlayRelativePosition) act.overlayRelativePosition = a.overlayRelativePosition;
    return act;
  }
  function serializeReactionForGet(r) {
    const out = {};
    if (r.trigger) out.trigger = r.trigger;
    if (r.actions && Array.isArray(r.actions)) {
      out.actions = r.actions.map(serializeAction);
    }
    return out;
  }
  function getReactions(params) {
    return __async(this, null, function* () {
      const id = params.id;
      if (!id) throw new Error("id is required");
      const node = yield figma.getNodeByIdAsync(id);
      if (!node) throw new Error(`Node not found: ${id}`);
      const result = {};
      if ("reactions" in node) {
        const reactions = node.reactions;
        if (Array.isArray(reactions) && reactions.length > 0) {
          result.reactions = reactions.map(serializeReactionForGet);
        } else {
          result.reactions = [];
        }
      } else {
        result.reactions = [];
      }
      if ("overflowDirection" in node) {
        result.overflowDirection = node.overflowDirection;
      }
      return result;
    });
  }
  function addReactionSingle(p) {
    return __async(this, null, function* () {
      const id = p.id;
      if (!id) throw new Error("id is required");
      if (!p.trigger) throw new Error("trigger is required");
      const node = yield figma.getNodeByIdAsync(id);
      if (!node) throw new Error(`Node not found: ${id}`);
      if (!("reactions" in node)) throw new Error(`Node ${node.type} does not support reactions`);
      let cursor = node;
      while (cursor && cursor.type !== "PAGE") cursor = cursor.parent;
      const sourcePageId = cursor == null ? void 0 : cursor.id;
      const existing = JSON.parse(JSON.stringify(node.reactions || []));
      p._sourcePageId = sourcePageId;
      const newReaction = yield buildReaction(p);
      existing.push(newReaction);
      yield node.setReactionsAsync(existing);
      return {};
    });
  }
  function setReactions(params) {
    return __async(this, null, function* () {
      const id = params.id;
      if (!id) throw new Error("id is required");
      if (!params.reactions) throw new Error("reactions array is required");
      const node = yield figma.getNodeByIdAsync(id);
      if (!node) throw new Error(`Node not found: ${id}`);
      if (!("reactions" in node)) throw new Error(`Node ${node.type} does not support reactions`);
      let sourcePage = node;
      while (sourcePage && sourcePage.type !== "PAGE") sourcePage = sourcePage.parent;
      if (sourcePage) {
        for (const reaction of params.reactions) {
          const actions = reaction.actions || (reaction.action ? [reaction.action] : []);
          for (const action of actions) {
            if (action.type === "NODE" && action.destinationId) {
              const dest = yield figma.getNodeByIdAsync(action.destinationId);
              if (dest) {
                let destPage = dest;
                while (destPage && destPage.type !== "PAGE") destPage = destPage.parent;
                if (destPage && destPage.id !== sourcePage.id) {
                  throw new Error(
                    `Destination "${dest.name}" (${action.destinationId}) is on page "${destPage.name}" but the source node is on page "${sourcePage.name}". Prototype interactions only work within the same page. Quick fix: frames(method:"clone", id:"${action.destinationId}", parentId:"${sourcePage.id}", name:"${dest.name}")`
                  );
                }
              }
            }
          }
        }
      }
      yield node.setReactionsAsync(params.reactions);
      return "ok";
    });
  }
  function removeReaction(params) {
    return __async(this, null, function* () {
      const id = params.id;
      if (!id) throw new Error("id is required");
      if (params.index === void 0) throw new Error("index is required");
      const node = yield figma.getNodeByIdAsync(id);
      if (!node) throw new Error(`Node not found: ${id}`);
      if (!("reactions" in node)) throw new Error(`Node ${node.type} does not support reactions`);
      const existing = JSON.parse(JSON.stringify(node.reactions || []));
      if (params.index < 0 || params.index >= existing.length) {
        throw new Error(`Index ${params.index} out of range (${existing.length} reactions)`);
      }
      existing.splice(params.index, 1);
      yield node.setReactionsAsync(existing);
      const after = node.reactions || [];
      if (after.length !== existing.length) {
        throw new Error(`Reaction removal failed \u2014 expected ${existing.length} reactions after removal, got ${after.length}. Try prototyping(method:"set", id:"${id}", reactions:[]) to clear all, then re-add the ones you want.`);
      }
      return "ok";
    });
  }
  var figmaHandlers22 = {
    get_reactions: getReactions,
    add_reaction: (p) => batchHandler(p, addReactionSingle),
    set_reactions: setReactions,
    remove_reaction: removeReaction
  };

  // src/handlers/registry.ts
  var cloneAdapter = (p) => figmaHandlers12.clone_node(__spreadProps(__spreadValues({}, p), {
    items: p.items ? p.items.map((i) => {
      var _a;
      return __spreadProps(__spreadValues({}, i), { nodeId: (_a = i.nodeId) != null ? _a : i.id });
    }) : [{ nodeId: p.id, name: p.name, parentId: p.parentId, x: p.x, y: p.y }]
  }));
  var deleteAdapter = (p) => {
    const items = p.items ? p.items.map((i) => {
      var _a;
      return __spreadProps(__spreadValues({}, i), { nodeId: (_a = i.nodeId) != null ? _a : i.id });
    }) : p.id ? [{ nodeId: p.id }] : [];
    return figmaHandlers12.delete_node(__spreadProps(__spreadValues({}, p), { items }));
  };
  var reparentAdapter = (p) => figmaHandlers12.insert_child(__spreadProps(__spreadValues({}, p), {
    items: (p.items || []).map((i) => ({ childId: i.id, parentId: i.parentId, index: i.index }))
  }));
  var auditAdapter = (p) => lintNodeHandler({ nodeId: p.id, rules: p.rules, maxDepth: p.maxDepth, maxFindings: p.maxFindings, minSeverity: p.minSeverity, skipInstances: p.skipInstances });
  var allFigmaHandlers = __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, figmaHandlers), figmaHandlers2), figmaHandlers3), figmaHandlers4), figmaHandlers6), figmaHandlers17), figmaHandlers9), figmaHandlers12), figmaHandlers15), figmaHandlers10), figmaHandlers13), figmaHandlers11), figmaHandlers14), figmaHandlers18), figmaHandlers16), figmaHandlers19), figmaHandlers20), figmaHandlers7), figmaHandlers21), figmaHandlers22), figmaHandlers5), {
    // ─── Endpoint-style command aliases (generated endpoints use {endpoint}.{method}) ───
    // connection endpoint
    "connection.get": figmaHandlers.ping,
    // selection endpoint
    "selection.get": figmaHandlers3.get_selection,
    "selection.set": figmaHandlers3.set_selection,
    "selection.update": figmaHandlers3.set_selection,
    // backward-compat alias
    // frames endpoint — own methods
    "frames.create": (params) => __async(null, null, function* () {
      const type = params.type;
      if (type === "frame") return figmaHandlers17.create_frame(params);
      if (type === "auto_layout") return figmaHandlers17.create_auto_layout(params);
      if (type === "section") return figmaHandlers6.create_section(params);
      if (type === "rectangle") return figmaHandlers6.create_rectangle(params);
      if (type === "ellipse") return figmaHandlers6.create_ellipse(params);
      if (type === "line") return figmaHandlers6.create_line(params);
      if (type === "group") return figmaHandlers6.create_group(params);
      if (type === "boolean_operation") return figmaHandlers6.create_boolean_operation(params);
      if (type === "svg") return figmaHandlers6.create_node_from_svg(params);
      if (type === "slot") return batchHandler(params, createSlotSingle, { keys: framesCreateSlot, help: 'frames(method: "help", topic: "create")' });
      throw new Error(`frames.create: unknown type "${type}". Expected: frame, auto_layout, section, rectangle, ellipse, line, group, boolean_operation, svg, slot`);
    }),
    // frames endpoint — inherited node base methods (translate endpoint params → legacy handler params)
    "frames.get": (p) => figmaHandlers4.get_node_info(__spreadProps(__spreadValues({}, p), { nodeIds: p.id ? [p.id] : p.nodeIds })),
    "frames.list": (p) => figmaHandlers4.search_nodes(__spreadProps(__spreadValues({}, p), { scopeNodeId: p.parentId })),
    "frames.update": (p) => {
      var _a;
      return figmaHandlers15.patch_nodes(__spreadProps(__spreadValues({}, p), {
        items: (_a = p.items) == null ? void 0 : _a.map((i) => {
          var _a2;
          return __spreadProps(__spreadValues({}, i), { nodeId: (_a2 = i.nodeId) != null ? _a2 : i.id });
        })
      }));
    },
    "frames.delete": deleteAdapter,
    "frames.clone": cloneAdapter,
    "frames.reparent": reparentAdapter,
    "frames.export": figmaHandlers4.export_node_as_image,
    "frames.audit": auditAdapter,
    "frames.commit": figmaHandlers8.commit,
    // ─── document endpoint ───
    "document.get": figmaHandlers2.get_current_page,
    "document.list": figmaHandlers2.get_document_info,
    "document.set": figmaHandlers2.set_current_page,
    "document.create": figmaHandlers2.create_page,
    "document.update": figmaHandlers2.rename_page,
    // ─── text endpoint — own methods ───
    "text.create": figmaHandlers9.create_text,
    "text.set_content": figmaHandlers14.set_text_content,
    "text.scan": figmaHandlers14.scan_text_nodes,
    // text endpoint — inherited node base methods
    "text.get": (p) => figmaHandlers4.get_node_info(__spreadProps(__spreadValues({}, p), { nodeIds: p.id ? [p.id] : p.nodeIds })),
    "text.list": (p) => figmaHandlers4.search_nodes(__spreadProps(__spreadValues({}, p), { scopeNodeId: p.parentId })),
    "text.update": (p) => {
      var _a;
      return figmaHandlers15.patch_nodes(__spreadProps(__spreadValues({}, p), {
        items: (_a = p.items) == null ? void 0 : _a.map((i) => {
          var _a2;
          return __spreadProps(__spreadValues({}, i), { nodeId: (_a2 = i.nodeId) != null ? _a2 : i.id });
        })
      }));
    },
    "text.delete": deleteAdapter,
    "text.clone": cloneAdapter,
    "text.audit": auditAdapter,
    "text.reparent": reparentAdapter,
    // ─── fonts endpoint ───
    "fonts.list": figmaHandlers18.get_available_fonts,
    // ─── lint endpoint ───
    "lint.check": figmaHandlers7.lint_node,
    "lint.fix": figmaHandlers7.lint_fix_autolayout,
    // ─── styles endpoint ───
    "styles.list": figmaHandlers19.styles,
    "styles.get": figmaHandlers19.styles,
    "styles.create": figmaHandlers19.styles,
    "styles.update": figmaHandlers19.styles,
    "styles.delete": figmaHandlers19.styles,
    // ─── components endpoint — own methods ───
    "components.list": figmaHandlers16.components,
    "components.get": figmaHandlers16.components,
    "components.create": figmaHandlers16.components,
    "components.update": figmaHandlers16.components,
    "components.audit": figmaHandlers16.components,
    "components.delete": figmaHandlers16.components,
    // components endpoint — inherited node base methods + commit
    "components.clone": cloneAdapter,
    "components.reparent": reparentAdapter,
    "components.commit": figmaHandlers8.commit,
    // ─── instances endpoint — own methods ───
    "instances.get": figmaHandlers16.instances,
    "instances.create": figmaHandlers16.instances,
    "instances.swap": figmaHandlers16.instances,
    "instances.detach": figmaHandlers16.instances,
    "instances.reset_overrides": figmaHandlers16.instances,
    "instances.audit": auditAdapter,
    // instances.update — combined: visual PatchItem params + component properties
    "instances.update": instanceUpdateCombined,
    // instances endpoint — inherited node base methods
    "instances.list": (p) => {
      var _a;
      return figmaHandlers4.search_nodes(__spreadProps(__spreadValues({}, p), { scopeNodeId: p.parentId, types: (_a = p.types) != null ? _a : ["INSTANCE"] }));
    },
    "instances.delete": deleteAdapter,
    "instances.clone": cloneAdapter,
    "instances.reparent": reparentAdapter,
    // ─── variable_collections endpoint ───
    "variable_collections.list": figmaHandlers20.variable_collections,
    "variable_collections.get": figmaHandlers20.variable_collections,
    "variable_collections.create": figmaHandlers20.variable_collections,
    "variable_collections.update": figmaHandlers20.variable_collections,
    "variable_collections.delete": figmaHandlers20.variable_collections,
    "variable_collections.add_mode": figmaHandlers20.variable_collections,
    "variable_collections.rename_mode": figmaHandlers20.variable_collections,
    "variable_collections.remove_mode": figmaHandlers20.variable_collections,
    // ─── variables endpoint ───
    "variables.list": figmaHandlers20.variables,
    "variables.get": figmaHandlers20.variables,
    "variables.create": figmaHandlers20.variables,
    "variables.update": figmaHandlers20.variables,
    "variables.delete": figmaHandlers20.variables,
    // ─── version_history endpoint ───
    "version_history.save": figmaHandlers21.save_version_history,
    // ─── prototyping endpoint ───
    "prototyping.get": figmaHandlers22.get_reactions,
    "prototyping.add": figmaHandlers22.add_reaction,
    "prototyping.set": figmaHandlers22.set_reactions,
    "prototyping.remove": figmaHandlers22.remove_reaction
    // ─── library endpoint ───
    // library.list and library.get are MCP-side REST calls — no plugin handler.
    // All library imports (components, styles) happen on-demand when agents reference
    // a *Name (componentName, fillStyleName, textStyleName, effectStyleName). The MCP
    // pre-processor attaches the key, and plugin-side appliers call
    // importComponentByKeyAsync / importStyleByKeyAsync at apply time (idempotent).
  });

  // src/plugin/code.ts
  var DEFAULT_WIDTH = 300;
  var MIN_WIDTH = 260;
  var MAX_WIDTH = 400;
  var state = {
    serverPort: 3055,
    channelName: "",
    locale: "",
    uiWidth: DEFAULT_WIDTH
  };
  figma.showUI(__html__, { width: DEFAULT_WIDTH, height: 480 });
  figma.clientStorage.getAsync("settings").then((saved) => {
    if (saved) {
      if (saved.serverPort) state.serverPort = saved.serverPort;
      if (saved.channelName) state.channelName = saved.channelName;
      if (saved.locale) state.locale = saved.locale;
      if (saved.uiWidth) {
        state.uiWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, saved.uiWidth));
        figma.ui.resize(state.uiWidth, 480);
      }
    }
    figma.ui.postMessage({ type: "restore-settings", serverPort: state.serverPort, channelName: state.channelName, locale: state.locale || "en", uiWidth: state.uiWidth });
  });
  var SKIP_FOCUS = /* @__PURE__ */ new Set([
    "join",
    "set_selection",
    "set_viewport",
    "zoom_into_view",
    "set_focus",
    "set_current_page",
    "create_page",
    "rename_page",
    "delete_node",
    "get_document_info",
    "get_current_page",
    "get_selection",
    "get_node_info",
    "get_available_fonts",
    "variable_collections",
    "variables",
    "search_nodes",
    "scan_text_nodes",
    "export_node_as_image",
    "lint_node",
    "get_node_variables",
    "ping"
  ]);
  function extractNodeIds(result, params) {
    const ids = [];
    if ((result == null ? void 0 : result.id) && typeof result.id === "string") ids.push(result.id);
    if (Array.isArray(result == null ? void 0 : result.results)) {
      for (const r of result.results) {
        if ((r == null ? void 0 : r.id) && typeof r.id === "string") ids.push(r.id);
      }
    }
    if (ids.length === 0 && Array.isArray(params == null ? void 0 : params.items)) {
      for (const item of params.items) {
        if ((item == null ? void 0 : item.nodeId) && typeof item.nodeId === "string") ids.push(item.nodeId);
      }
    }
    return ids;
  }
  function autoFocus(nodeIds) {
    return __async(this, null, function* () {
      const nodes = [];
      for (const id of nodeIds) {
        const node = yield figma.getNodeByIdAsync(id);
        if (node && "x" in node) nodes.push(node);
      }
      if (nodes.length > 0) {
        figma.currentPage.selection = nodes;
        figma.viewport.scrollAndZoomIntoView(nodes);
      }
    });
  }
  var pendingAutoFocus = null;
  figma.ui.onmessage = (msg) => __async(null, null, function* () {
    switch (msg.type) {
      case "update-settings":
        updateSettings(msg);
        break;
      case "notify":
        figma.notify(msg.message);
        break;
      case "close-plugin":
        figma.closePlugin();
        break;
      case "resize":
        if (msg.width) {
          state.uiWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, msg.width));
        }
        figma.ui.resize(state.uiWidth, msg.height);
        break;
      case "save-width":
        state.uiWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, msg.width));
        figma.clientStorage.setAsync("settings", {
          serverPort: state.serverPort,
          channelName: state.channelName,
          locale: state.locale,
          uiWidth: state.uiWidth
        });
        break;
      case "execute-command":
        try {
          if (pendingAutoFocus) {
            yield pendingAutoFocus;
            pendingAutoFocus = null;
          }
          const result = yield handleCommand(msg.command, msg.params);
          figma.ui.postMessage({
            type: "command-result",
            id: msg.id,
            result
          });
          if (!SKIP_FOCUS.has(msg.command)) {
            const ids = extractNodeIds(result, msg.params);
            if (ids.length > 0) {
              pendingAutoFocus = autoFocus(ids).catch(() => {
              });
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error) || "Error executing command";
          figma.ui.postMessage({
            type: "command-error",
            id: msg.id,
            error: errorMsg || `Unknown error (${typeof error})`
          });
        }
        break;
    }
  });
  figma.on("run", ({ command }) => {
    figma.ui.postMessage({ type: "auto-connect" });
  });
  function updateSettings(settings) {
    if (settings.serverPort) {
      state.serverPort = settings.serverPort;
    }
    if (settings.channelName !== void 0) {
      state.channelName = settings.channelName;
    }
    if (settings.locale) {
      state.locale = settings.locale;
    }
    figma.clientStorage.setAsync("settings", {
      serverPort: state.serverPort,
      channelName: state.channelName,
      locale: state.locale,
      uiWidth: state.uiWidth
    });
  }
  function handleCommand(command, params) {
    return __async(this, null, function* () {
      const handler = allFigmaHandlers[command];
      if (!handler) throw new Error(`Unknown command: ${command}`);
      yield figma.currentPage.loadAsync();
      return yield handler(params);
    });
  }
})();
