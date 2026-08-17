// Fait échouer une promesse si elle ne se résout pas dans le délai
// imparti, au lieu de laisser l'utilisateur face à un bouton qui tourne
// indéfiniment sans jamais donner de retour (upload bloqué, requête
// réseau qui ne répond jamais, etc.).
export function withTimeout<T>(promise: Promise<T>, ms: number, message = "Délai dépassé — réessaie."): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
