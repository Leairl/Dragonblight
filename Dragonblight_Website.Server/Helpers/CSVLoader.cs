    public class CSVLoader
    {

        public static void LoadAll()
        {
            ItemDisplayInfos.data.Clear();
            ReadCSV(@"Item.csv", (values) => {
                ItemDisplayInfos.data.Add(new ItemDisplayInfo(
                                        int.Parse(values[0]), int.Parse(values[1]), int.Parse(values[2]),
                                        int.Parse(values[3])));
            });
            //the Optimize tab's stat weights; without the file, it suggests nothing it would have to rank
            ForeverStatWeights.Load(@"ForeverStatWeights.json");
            //Tab-separated, since sources like "Vendor: Qia (Winterspring)" can hold commas: recipe id, required
            //skill (blank when unknown), pattern|estimate|unknown, item id, item name, item icon, source.
            //Without the file, recipes have no required skill or source and the page shows them all.
            ForeverRecipes.data.Clear();
            if (File.Exists(@"ForeverRecipes.tsv"))
            {
                foreach (var line in File.ReadLines(@"ForeverRecipes.tsv"))
                {
                    var values = line.Split('\t');
                    if (values.Length < 7 || !int.TryParse(values[0], out var recipeId))
                    {
                        continue;
                    }
                    int? skill = null;
                    if (int.TryParse(values[1], out var level))
                    {
                        skill = level;
                    }
                    int? itemId = null;
                    if (int.TryParse(values[3], out var item))
                    {
                        itemId = item;
                    }
                    ForeverRecipes.data[recipeId] = new ForeverRecipeInfo
                    {
                        requiredSkill = skill,
                        estimated = values[2] == "estimate",
                        itemId = itemId,
                        itemName = values[4],
                        itemIcon = values[5],
                        source = values[6],
                    };
                }
            }
        }
        public static void ReadCSV(string csv_file, Action<string[]> callback)
        {
            using var reader = new StreamReader(csv_file);
            while (!reader.EndOfStream)
            {
                var line = reader.ReadLine();
                if (line != null)
                {
                    var values = line.Split(',');
                    try
                    {
                        callback(values);
                    }
                    catch { } // eat this and ignore values we don't like..
                }
            }
        }
    }