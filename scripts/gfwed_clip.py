"""Potong FWI harian GFWED ke bingkai Indonesia. Tidak menulis batas administrasi."""
import json
import sys

import numpy as np
from netCDF4 import Dataset

VARIABLE = "GEOS-5_FWI"


def main():
    path, south, west, north, east, out = sys.argv[1:7]
    dataset = Dataset(path)
    if VARIABLE not in dataset.variables:
        raise SystemExit(f"variabel {VARIABLE} tidak ada")
    latitudes = np.array(dataset.variables["lat"][:])
    longitudes = np.array(dataset.variables["lon"][:])
    grid = np.array(dataset.variables[VARIABLE][0])
    points = []
    for lat_index, latitude in enumerate(latitudes):
        if latitude < float(south) or latitude > float(north):
            continue
        for lon_index, longitude in enumerate(longitudes):
            if longitude < float(west) or longitude > float(east):
                continue
            value = float(grid[lat_index, lon_index])
            if value != value:
                continue
            points.append({"lat": round(float(latitude), 4), "lon": round(float(longitude), 4), "fwi": value})
    with open(out, "w", encoding="utf-8") as handle:
        json.dump({"variable": VARIABLE, "n": len(points), "points": points}, handle)
    print(len(points))


if __name__ == "__main__":
    main()
