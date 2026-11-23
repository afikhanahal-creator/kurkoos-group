# מוריד מ-Poly Haven (רישיון CC0) את ה-HDRI, הטקסטורות והרהיטים של המודל.
# הרצה: python3 fetch_polyhaven.py <תיקיית נכסים>
import json, os, sys, urllib.request, concurrent.futures as cf
DST = sys.argv[1]
HDRI = {'sunset_jhbcentral': '4k'}
TEX = ['wooden_floor_02', 'herringbone_parquet', 'large_grey_tiles', 'marble_01', 'long_white_tiles', 'white_plaster_02',
       'rough_linen', 'velour_velvet', 'fabric_pattern_05', 'leather_white', 'oak_veneer_01', 'walnut_veneer',
       'wood_floor_deck', 'granite_tile', 'marble_tiles', 'concrete_floor_02', 'terrazzo_tiles', 'quatrefoil_jacquard_fabric']
MODELS = ['sofa_02', 'sofa_03', 'modern_arm_chair_01', 'mid_century_lounge_chair', 'dining_chair_02', 'coffee_table_round_01',
          'modern_coffee_table_01', 'side_table_01', 'side_table_tall_01', 'potted_plant_01', 'potted_plant_02', 'potted_plant_04',
          'calathea_orbifolia_01', 'pachira_aquatica_01', 'anthurium_botany_01', 'hanging_picture_frame_01', 'hanging_picture_frame_02',
          'hanging_picture_frame_03', 'decorative_book_set_01', 'book_encyclopedia_set_01', 'ceramic_vase_01', 'ceramic_vase_02',
          'ceramic_vase_03', 'desk_lamp_arm_01', 'modern_ceiling_lamp_01', 'throw_pillows_01', 'bar_chair_round_01', 'tea_set_01',
          'wooden_bowl_01', 'food_apple_01', 'lemon', 'wine_bottles_01', 'jug_01', 'outdoor_table_chair_set_01', 'planter_box_01',
          'shrub_01', 'shrub_02', 'shrub_04', 'island_tree_01', 'jacaranda_tree', 'ClassicNightstand_01', 'modern_wooden_cabinet',
          'television_02', 'wicker_basket_01', 'wall_clock', 'brass_vase_01', 'carved_wooden_plate', 'wooden_cutting_board',
          'standing_picture_frame_01', 'Ottoman_01', 'round_wooden_table_01', 'metal_stool_02', 'GreenChair_01', 'chess_set']


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'apartment-model-builder'})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
        f.write(r.read())


def files(aid):
    req = urllib.request.Request(f'https://api.polyhaven.com/files/{aid}', headers={'User-Agent': 'apartment-model-builder'})
    return json.load(urllib.request.urlopen(req, timeout=60))


jobs = []
for h, res in HDRI.items():
    jobs.append((files(h)['hdri'][res]['hdr']['url'], f'{DST}/hdri/{h}.hdr'))
for t in TEX:
    fl = files(t)
    if 'Diffuse' not in fl and 'col_01' in fl:          # טקסטורות בכמה צבעים: לוקחים את הראשון
        fl['Diffuse'] = fl['col_01']
    for k in ('Diffuse', 'nor_gl', 'Rough', 'Displacement', 'AO'):
        if k in fl and '2k' in fl[k]:
            jobs.append((fl[k]['2k']['jpg']['url'] if 'jpg' in fl[k]['2k'] else fl[k]['2k']['png']['url'], f'{DST}/tex/{t}/{k}.jpg'))
for m in MODELS:
    try:
        g = files(m)['gltf']['1k']['gltf']
    except Exception as e:
        print('skip', m, e); continue
    jobs.append((g['url'], f'{DST}/models/{m}/{m}.gltf'))
    for rel, inc in g.get('include', {}).items():
        jobs.append((inc['url'], f'{DST}/models/{m}/{rel}'))
with cf.ThreadPoolExecutor(12) as ex:
    list(ex.map(lambda j: get(*j), jobs))
print('downloaded', len(jobs), 'files')
