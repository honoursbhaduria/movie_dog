// Wishlist utility functions using localStorage

export const getWishlist = () => {
  const wishlist = localStorage.getItem('movieWishlist');
  return wishlist ? JSON.parse(wishlist) : [];
};

export const addToWishlist = (movie) => {
  const wishlist = getWishlist();
  const exists = wishlist.find(item => item.id === movie.id);
  
  if (!exists) {
    const wishlistItem = {
      ...movie,
      addedAt: new Date().toISOString(),
      priceHistory: []
    };
    wishlist.push(wishlistItem);
    localStorage.setItem('movieWishlist', JSON.stringify(wishlist));
    return true;
  }
  return false;
};

export const removeFromWishlist = (movieId) => {
  const wishlist = getWishlist();
  const filtered = wishlist.filter(item => item.id !== movieId);
  localStorage.setItem('movieWishlist', JSON.stringify(filtered));
};

export const isInWishlist = (movieId) => {
  const wishlist = getWishlist();
  return wishlist.some(item => item.id === movieId);
};

export const updateMoviePrices = (movieId, providers) => {
  const wishlist = getWishlist();
  const movie = wishlist.find(item => item.id === movieId);
  
  if (movie) {
    const priceEntry = {
      date: new Date().toISOString(),
      providers: providers
    };
    
    if (!movie.priceHistory) {
      movie.priceHistory = [];
    }
    movie.priceHistory.push(priceEntry);
    
    // Keep only last 30 days of price history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    movie.priceHistory = movie.priceHistory.filter(
      entry => new Date(entry.date) > thirtyDaysAgo
    );
    
    localStorage.setItem('movieWishlist', JSON.stringify(wishlist));
  }
};

// Platform preferences
export const getPlatformPreferences = () => {
  const prefs = localStorage.getItem('platformPreferences');
  return prefs ? JSON.parse(prefs) : [];
};

export const setPlatformPreferences = (platforms) => {
  localStorage.setItem('platformPreferences', JSON.stringify(platforms));
};

export const togglePlatformPreference = (providerId, providerName) => {
  const prefs = getPlatformPreferences();
  const exists = prefs.find(p => p.id === providerId);
  
  if (exists) {
    const filtered = prefs.filter(p => p.id !== providerId);
    setPlatformPreferences(filtered);
  } else {
    prefs.push({ id: providerId, name: providerName });
    setPlatformPreferences(prefs);
  }
};

export const hasPlatformPreference = (providerId) => {
  const prefs = getPlatformPreferences();
  return prefs.some(p => p.id === providerId);
};
