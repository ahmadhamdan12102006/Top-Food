import type { InventoryItem } from '../types';

const normalizeIngredientName = (value: string) => value.trim().toLowerCase();

export const buildInventoryMap = (inventoryItems: InventoryItem[]) =>
  new Map(
    inventoryItems.map((item) => [normalizeIngredientName(item.name), item])
  );

export const getInventoryItemByIngredientName = (
  inventoryMap: Map<string, InventoryItem>,
  ingredientName: string
) => inventoryMap.get(normalizeIngredientName(ingredientName));

export const getUnavailableIngredients = (
  ingredientNames: string[] = [],
  inventoryMap: Map<string, InventoryItem>
) =>
  ingredientNames.filter((ingredientName) => {
    const item = getInventoryItemByIngredientName(inventoryMap, ingredientName);
    return item?.isAvailable === false;
  });
