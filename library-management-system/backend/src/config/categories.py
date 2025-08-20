"""
書籍カテゴリ体系の定義
"""

# 大項目・中項目のカテゴリ体系
CATEGORY_STRUCTURE = {
    "技術書": [
        "プログラミング",
        "ソフトウェア設計",
        "ソフトウェア開発",
        "インフラ・ネットワーク", 
        "データベース",
        "セキュリティ",
        "AI・機械学習",
        "アーキテクチャ",
        "その他技術",
        "その他"  # 書籍インポート時の汎用カテゴリとして追加
    ],
    "ビジネス書": [
        "経営・戦略",
        "マーケティング",
        "組織・人事",
        "自己啓発",
        "リーダーシップ",
        "イノベーション",
        "その他ビジネス"
    ],
    "一般書": [
        "小説・文芸",
        "実用書",
        "趣味・教養",
        "健康・ライフスタイル",
        "歴史・社会",
        "科学・自然",
        "その他一般"
    ]
}

# 大項目一覧
MAJOR_CATEGORIES = list(CATEGORY_STRUCTURE.keys())

# 全中項目一覧
ALL_MINOR_CATEGORIES = []
for major, minors in CATEGORY_STRUCTURE.items():
    ALL_MINOR_CATEGORIES.extend(minors)

def get_minor_categories(major_category: str) -> list:
    """指定した大項目の中項目一覧を取得"""
    return CATEGORY_STRUCTURE.get(major_category, [])

def validate_category_structure(major_category: str, minor_categories: list) -> bool:
    """カテゴリ構造の妥当性をチェック"""
    if major_category not in MAJOR_CATEGORIES:
        return False
    
    valid_minors = get_minor_categories(major_category)
    for minor in minor_categories:
        if minor not in valid_minors:
            return False
    
    return True

def get_default_category_structure():
    """デフォルトのカテゴリ構造を取得"""
    return {
        "major_category": "技術書",
        "minor_categories": []
    } 