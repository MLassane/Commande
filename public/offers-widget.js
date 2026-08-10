(function () {
  var SITE = "https://massage-stick.vercel.app";

  function fmt(n) {
    return n.toLocaleString("fr-FR") + " FCFA";
  }

  document.querySelectorAll("[data-offers-widget]").forEach(function (container) {
    var handle = container.getAttribute("data-offers-widget");
    var ctaSelector = container.getAttribute("data-cta") || "#cta-btn";
    var ctaEl = document.querySelector(ctaSelector);

    fetch(SITE + "/api/products/" + handle)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        var product = data && data.product;
        if (!product) return;

        var offers = product.offers && product.offers.length > 0 ? product.offers : [{ qty: 1, price: product.price }];

        function updateCta(qty) {
          if (ctaEl) ctaEl.href = SITE + "/commande?produit=" + handle + "&offre=" + qty;
        }

        container.innerHTML = "";
        offers.forEach(function (offer, i) {
          var label = document.createElement("label");
          label.style.cssText =
            "display:flex;justify-content:space-between;align-items:center;border:1.5px solid " +
            (i === 0 ? "#f4841c" : "#ddd") +
            ";background:" + (i === 0 ? "#fff7f0" : "#fff") +
            ";border-radius:10px;padding:12px 16px;margin-bottom:8px;cursor:pointer;";

          var left = document.createElement("span");
          var radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "ow-offer-" + handle;
          radio.checked = i === 0;
          radio.style.marginRight = "8px";
          left.appendChild(radio);
          left.appendChild(document.createTextNode(offer.qty + " " + product.name));

          if (i === offers.length - 1 && offers.length > 1) {
            var badge = document.createElement("span");
            badge.textContent = "Meilleure offre";
            badge.style.cssText = "margin-left:8px;background:#2a9d8f;color:#fff;font-size:0.75em;padding:2px 8px;border-radius:20px;";
            left.appendChild(badge);
          }

          var right = document.createElement("b");
          right.textContent = fmt(offer.price);

          label.appendChild(left);
          label.appendChild(right);

          label.addEventListener("click", function () {
            container.querySelectorAll("label").forEach(function (l) {
              l.style.border = "1.5px solid #ddd";
              l.style.background = "#fff";
              l.querySelector("input").checked = false;
            });
            label.style.border = "1.5px solid #f4841c";
            label.style.background = "#fff7f0";
            radio.checked = true;
            updateCta(offer.qty);
          });

          container.appendChild(label);
        });

        updateCta(offers[0].qty);
      })
      .catch(function () {});
  });
})();
