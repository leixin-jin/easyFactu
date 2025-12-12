import next from "eslint-config-next";

const config = [
  {
    ignores: ["node_modules", ".next", "coverage"],
  },
  ...next.map((cfg) =>
    cfg?.name === "next"
      ? {
          ...cfg,
          rules: {
            ...cfg.rules,
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/purity": "off",
          },
        }
      : cfg,
  ),
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default config;
