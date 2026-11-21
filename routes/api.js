'use strict';

const StockModel = require('../models').Stock;
const fetch = require('node-fetch');

async function createStock(stock, like, ip) {
  const newStock = new StockModel({
    symbol: stock,
    likes: like ? [ip] : [],
  });
  const savedNew = await newStock.save();
  return savedNew;
}

async function findStock(stock) {
  return await StockModel.findOne({ symbol: stock }).exec();
}

async function saveStock(stock, like, ip) {
  let saved = {};
  const foundStock = await findStock(stock);
  if (!foundStock) {
    const createsaved = await createStock(stock, like, ip);
    saved = createsaved;
    return saved;
  } else {
    if (like && foundStock.likes.indexOf(ip) === -1) {
      foundStock.likes.push(ip);
    }
    saved = await foundStock.save();
    return saved;
  }
}

async function getStock(stock) {
  if (!stock) return { symbol: null, latestPrice: null };

  try {
    const response = await fetch(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${encodeURIComponent(stock)}/quote`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.symbol) {
        return {
          symbol: data.symbol,
          latestPrice: Number.isFinite(data.latestPrice) ? data.latestPrice : 0,
        };
      }
    }
  } catch (err) {
    console.error(`Stock lookup failed for ${stock}:`, err.message);
  }

  return {
    symbol: stock.toUpperCase(),
    latestPrice: 0,
  };
}

module.exports = function (app) {
  app.route('/api/stock-prices').get(async function (req, res) {
    try {
      const { stock, like } = req.query;
      const shouldLike = like === true || like === 'true';

      if (Array.isArray(stock)) {
        const { symbol, latestPrice } = await getStock(stock[0]);
        const { symbol: symbol2, latestPrice: latestPrice2 } = await getStock(
          stock[1]
        );

        const firststock = await saveStock(symbol || stock[0], shouldLike, req.ip);
        const secondstock = await saveStock(symbol2 || stock[1], shouldLike, req.ip);
        let stockData = [];
        if (!symbol) {
          stockData.push({
            rel_likes: firststock.likes.length - secondstock.likes.length,
          });
        } else {
          stockData.push({
            stock: symbol,
            price: latestPrice,
            rel_likes: firststock.likes.length - secondstock.likes.length,
          });
        }

        if (!symbol2) {
          stockData.push({
            rel_likes: secondstock.likes.length - firststock.likes.length,
          });
        } else {
          stockData.push({
            stock: symbol2,
            price: latestPrice2,
            rel_likes: secondstock.likes.length - firststock.likes.length,
          });
        }

        res.json({
          stockData,
        });
        return;
      }

      const { symbol, latestPrice } = await getStock(stock);
      const oneStockData = await saveStock(symbol, shouldLike, req.ip);

      res.json({
        stockData: {
          stock: symbol,
          price: latestPrice,
          likes: oneStockData.likes.length,
        },
      });
    } catch (err) {
      console.error('API Error:', err);
      res.status(500).json({ error: err.message });
    }
  });
};
