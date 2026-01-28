// ============================================
// Food Delivery Deep Links (Universal)
// Works in Frontend & Backend
// ============================================

const PROVIDERS = {
  uberEats: {
    name: "Uber Eats",
    baseUrl: "https://www.ubereats.com/search?q=",
  },
  foodpanda: {
    name: "Foodpanda",
    baseUrl: "https://www.foodpanda.pk/search?q=",
  },
  talabat: {
    name: "Talabat",
    baseUrl: "https://www.talabat.com/search?query=",
  },
};

/**
 * Generate deep links for a given food item
 * @param {string} foodName
 * @returns {object} providerName -> { provider, url }
 */
export function generateFoodLinks(foodName) {
  if (!foodName || typeof foodName !== "string") return {};

  const query = encodeURIComponent(foodName.trim());

  return Object.entries(PROVIDERS).reduce((links, [key, provider]) => {
    links[key] = {
      provider: provider.name,
      url: `${provider.baseUrl}${query}`,
    };
    return links;
  }, {});
}

/**
 * Attach deep links to an array of food recommendations
 * @param {Array<{ name: string, description?: string }>} recommendations
 * @returns {Array}
 */
export function attachFoodLinks(recommendations = []) {
  if (!Array.isArray(recommendations)) return [];

  return recommendations.map((item) => ({
    ...item,
    deliveryLinks: generateFoodLinks(item.name),
  }));
}
