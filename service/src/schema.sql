CREATE TABLE
  IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_picture_url TEXT DEFAULT '/default_profile_picture.svg',
    description TEXT,
    role TEXT CHECK (role IN ('user', 'admin')) NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

CREATE TABLE
  IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    board_id INTEGER,
    FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
  );

CREATE TABLE
  IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    author_id INTEGER,
    title TEXT NOT NULL,
    category_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users (id),
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
  );

CREATE TABLE
  IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER,
    author_id INTEGER,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users (id)
  );

INSERT INTO
  users (username, password, role)
VALUES
  ('admin', 'admin', 'admin'),
  ('user', 'user', 'user');

INSERT INTO
  boards (name)
VALUES
  ('場外休憩區');

INSERT INTO
  categories (name, board_id)
VALUES
  ('場外綜合', 1),
  ('大樓專區', 1),
  ('動漫遊戲', 1),
  ('生活百態', 1),
  ('心情點滴', 1),
  ('綜合娛樂', 1),
  ('新聞焦點', 1),
  ('政治議題', 1),
  ('食趣旅遊', 1),
  ('認真求助', 1),
  ('創作天地', 1),
  ('技藝知識', 1);

INSERT INTO
  boards (name)
VALUES
  ('超異域公主連結');

INSERT INTO
  categories (name, board_id)
VALUES
  ('綜合討論', 2),
  ('攻略心得', 2),
  ('會戰討伐', 2),
  ('劇情討論', 2),
  ('集中討論', 2),
  ('板友創作', 2),
  ('AI創作', 2),
  ('設備問題', 2),
  ('日服專區', 2),
  ('日服公會', 2),
  ('它服專區', 2),
  ('它服公會', 2),
  ('台服專區', 2),
  ('食殿公會', 2),
  ('步曉心會', 2),
  ('社群交流', 2),
  ('閒聊抱怨', 2);

INSERT INTO
  boards (name)
VALUES
  ('Steam 綜合討論板');

INSERT INTO
  categories (name, board_id)
VALUES
  ('綜合討論', 3),
  ('購物建議', 3),
  ('Deck 硬體', 3),
  ('資訊快報', 3),
  ('免費抽獎', 3),
  ('心得攻略', 3),
  ('交易專區', 3),
  ('中文模組', 3),
  ('功能教學', 3),
  ('約戰招生', 3),
  ('實況專區', 3);

INSERT INTO
  boards (name)
VALUES
  ('蔚藍檔案');

INSERT INTO
  categories (name, board_id)
VALUES
  ('綜合討論', 4),
  ('攻略心得', 4),
  ('日版討論', 4),
  ('國際繁中', 4),
  ('總力決戰', 4),
  ('戰術大賽', 4),
  ('檔案記錄', 4),
  ('檔案創作', 4),
  ('劇情討論', 4),
  ('問題發問', 4),
  ('社團徵友', 4),
  ('影片實況', 4),
  ('心情雜談', 4);

INSERT INTO
  boards (name)
VALUES
  ('鍊金術士系列');

INSERT INTO
  categories (name, board_id)
VALUES
  ('綜合討論', 5),
  ('公告活動', 5),
  ('A1～3', 5),
  ('A4～5', 5),
  ('A6～8', 5),
  ('A9～10', 5),
  ('亞蘭德', 5),
  ('露露亞', 5),
  ('黃昏', 5),
  ('不可思議', 5),
  ('蘇菲２', 5),
  ('萊莎系列', 5),
  ('外傳相關', 5),
  ('奈爾克', 5),
  ('動畫相關', 5),
  ('週邊相關', 5),
  ('板友創作', 5);

INSERT INTO
  threads (board_id, author_id, title, category_id)
VALUES
  (1, 1, '這是一個測試文章', 1);

INSERT INTO
  posts (thread_id, author_id, content)
VALUES
  (
    1,
    1,
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec id luctus leo, eu imperdiet purus. Mauris at magna ac ligula tristique pellentesque eu ut tortor. Suspendisse gravida dignissim lacus, vitae viverra turpis pulvinar quis. Pellentesque a sodales felis. Mauris quis porttitor leo, quis ornare ante. Vivamus luctus enim vel orci tempus, vitae auctor massa viverra. Maecenas tortor neque, sagittis sed enim id, sagittis rhoncus lectus. Integer placerat sapien nec ipsum blandit finibus.'
  );