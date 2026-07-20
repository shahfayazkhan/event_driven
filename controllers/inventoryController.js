const models = require('../models');

exports.getInventory = async (req, res) => {
  try {
    const { Inventory } = models;
    const items = await Inventory.findAll();
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { Inventory } = models;
    const { id } = req.params;
    const { availableStock } = req.body;

    const item = await Inventory.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });

    await item.update({ availableStock: parseInt(availableStock, 10) });

    return res.json({ message: 'Stock updated successfully', item });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
