# Лабораторная работа №3

## Интеграция пользовательского интерфейса с базой данных

В данной лабораторной работе необходимо объединить знания полученные на предыдущих лабах, для выполнения интеграции между клиентом, сервером и БД.

Далее пошагово описан процесс настройки и взаимодействия отдельных модулей, а т.ж приведен список заданий в конце документа.

### Шаг :zero: -- Подготовка проекта

В качестве отправной точки мы будем использовать итоговый проект из Лабы №1, с немного изменненной структурой.
Для начала установим npm-зависимости. Для этого в командной строке выполним команду
```js
  npm install
```
В данной лабе мы подключаем клиентскую часть, как зависимость проекта (_library-ui_ в package.json), и нам не нужно запускать ее отдельной командой. После установки зависимостей и автоматической сборки клиентского приложения нам остается только запустить наш сервер командой
```js
  npm start
```
после чего перейдем по адресу *http://localhost:8080*, где должна появиться наша коллекция книг.

>P.S. В package.json в поле "scripts" определена команда start:dev. Эта команда использует библиотеку [_nodemon_](https://github.com/remy/nodemon), которая позволяет существенно ускорить процесс разработки node-приложений (вам не нужно будет перезапускать сервер каждый раз после внесения изменений в код!). Запустите ее вместо команды *start* следующим образом: *npm run start:dev*. 

### Шаг :one: -- Подключение MongoDB

Для того, чтобы обеспечить взаимную работу нашей БД с сервером необходимо установить специальный npm-пакет [**mongodb**](https://www.npmjs.com/package/mongodb), который является официальным драйвером [MongoDB](https://www.mongodb.com/) для [Node.js](https://nodejs.org/en/) и предоставляет высокоуровневое API поверх mongodb-ядра. Скорее всего он у вас уже установлен. Для этого загляните в файл package.json (объект "_dependencies_"), если же нет, введите в консоли следующую команду

``` js
  npm install --save mongodb
```

Теперь необходимо подключить установленный пакет к проекту. Для того, чтобы использовать объект нашей БД в любом месте проекта вынесем логику взаимодействия с ним в отдельный модуль: создадим папку `./db` в корне проекта, а т.ж файл `index.js` в ней.

Импортируем нужную нам библиотеку с помощью подхода CommonJS (функции _required_). В данном случае нас интересует объект [MongoClient](https://www.npmjs.com/package/mongodb#connecting-to-mongodb), который позволит установить соединение с БД, а затем при ее успешном установлении получить объект БД. 

Ниже приведен код модуля, который экспортирует метод **connect**, который принимает на вход один парамер -- путь к БД, затем пробует установить соединение, и кладет в переменную _db объект БД, если соединение установлено, в противном случае передает ошибку. Перенесите этот код в свой модуль.

``` js
const MongoClient = require('mongodb').MongoClient;
let _db = null;

module.exports = {
  connect(url) {
    return MongoClient.connect(url)
      .then(db => (_db = db))
      .catch(err => Promise.reject(err));
  },
};
```

>**Важно!** В данном подходе мы используем [_Promise_](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Promise), чтобы получить результат подключения к БД. 
**Promise** – это специальный объект, который содержит своё состояние, и используется для работы с асинронными вычислениями (похоже на Futures в Java). Для передачи результата от одного обработчика к другому у Promise используется чейнинг _прим._ `.then(...).then(...)`. Этот подход мы будем использовать далее в лаботаторной работе.

Отлично, теперь переменная _db хранит объект базы данных. Но сейчас он не очень полезен, т.к используется только в текущем модуле. Целесообразно будет написать метод, который бы отдавал нам этот объект. 

#### Задание 1.1 
>Напишите метод `getInstance` (по примеру `#connect`), который будет отдавать объект БД, если тот имеется, в противном случае, выбрасываем ошибку, что соединение прервано.

Для удобства добавим т.ж метод `getCollection`, который будет принимать название коллекции БД, и возвращать объект этой коллекции соответственно.

```js
module.exports = {
  ...
  getCollection(name) {
    return this.getInstance().collection(name);
  }
}
```
>P.S. Если коллекция не найдена, MongoDB неявно создает [новую коллекцию](https://docs.mongodb.com/manual/reference/method/db.getCollection/#behavior) самостоятельно.

Далее Вам необходимо запустить сервер mongod и оболочку mongo как в [прошлой лабе](https://github.com/DairoGrey/rgrtu-lab2-mongo#221-Запуск).

Шаг 1 почти завершен, осталось выполнить само подключение, используя наш модуль db. Перейдем в файл "server.js", подключим наш модуль, а т.ж зададим **URL** нашей БД в константе.

```js
const MongoDB = require('./db');
const DB_URL = 'mongodb://localhost:27017/library';
```

Далее используя написанный ранее метод **connect** установим соединение с БД, если все успешно в следующем **.then()** мы можем использовать серверную часть, в противном случае выводим ошибку соединения и завершаем программу.

```js
// импорт зависимостей
...

MongoDB.connect(DB_URL)
  .then(() => {
    console.log(`Connected succsessfully!`);
    // код серверной части
    ...
  })
  .catch(err => console.log(`An error with connection to db ${err}!`));
```

Если все сделано правильно, то в консоли вы увидете следующую информацию:
```js
  [nodemon] starting `node server.js`
  Connected succsessfully!
  Server is running: localhost:8080
```

### Шаг :two: -- Создание сервисов

В предыдущих лабораторных работах вами были созданы несколько путей для доступа к API (`./api/index.js`). Сейчас они  предоставляют фиктивные данные, взятые из JSON. Наша задача -- создать модуль, который будет иметь доступ к объекту БД и вытаскивать из нее необходимые данные, согласно запросам с клиента.

Рассмотрим пример с созданием сервиса для коллекции книг.

Создадим папку `./services`, и файл `book.service.js`. 
Получим объект коллекции "books" из нашей БД `./db/index.js` с помощью `#getCollection` и для удобства запишем его в отдельную переменную. 

```js
const bookCol = require('../db').getCollection('books');
```

Далее создадим объект сервиса, который в дальнейшем будет пополняться методами для работы с БД, а т.ж выполним его `export`. На примере запроса получения всех книг - **GET /api/books** напишем метод, который будем использовать в API:

```js
const service = {
  getAllBooks() {
    return bookCol.find({}).toArray();
  },
};

module.exports = service;
```

Синтаксис запросов с помощью _mongodb_ очень похож на mongo-shell, используемый вами на предыдущей лабе. Однако, вы могли заметить метод "**toArray**". Дело в том, что метод find возвращает не данные, а объект _Cursor_ - указатель на результирующий набор данных, полученных с помощью запроса. Но нам нужны документы, а не указатель. Для этого и используется метод "toArray".

Подробнее про cursor можно прочитать [здесь](https://docs.mongodb.com/manual/reference/method/js-cursor/), а про метод toArray [здесь](https://docs.mongodb.com/manual/reference/method/cursor.toArray/index.html).


> **Важно!** Драйвер mongodb позволяет использовать 2 вида управления асинхронными операциями:
>* `callback`, передаваемый в используемую функцию
>* возвращая `Promise` из используемой функции
>
>Выполняя запрос к БД мы также выполняем асинхронную операцию. Ранее в этой лекции приводилось описание удобного применения Promise используя _chaining_, далее в примере, мы вызываем **.then()** у метода _getAllBooks_, это значит, что метод _toArray_, нашего запроса, вернул Promise с данными, которые мы как раз удобно получаем в следущем **.then()**. После чего вызываем метод __send__ объекта response, и отправляем данные на клиент.

Далее импортируем наш сервис в файл с API и используем его по-назначению:

```js
...
const bookService = require('../services/book.service');

router
  .get('/books', (req, res) => {
      bookService.getAllBooks()
        .then(data => res.send(data))
        .catch(err => res.send(err));
  })
  ...
```

Теперь, если мы обновим странуцу, то увидим список книг, хранящихся в БД.

Отлично! У нас написан сервис для коллекции книжек. Но это еще не все :grimacing:

На нашем клиенте реализована сортировка и категоризация имеющихся книжек. Список категорий и фильтров также, как и книг, мы будем передавать с сервера при начальной загрузке нашего клиентского приложения из коллекций _Фильтров_ и _Категорий_ соответственно.

#### 🎭 Задания по вариантам
#### Задание 2.1
>По примеру создания _bookService_, написать сервис для коллекции:
>* "categories" -- четный вариант
>* "filters" -- нечетный вариант
>
>который будут иметь единственный метод `getAll(Categories|Filters)` и подключить его к соответствующим ручкам роутера.

P.S. т.к эти сервисы понадобятся каждому, код сервиса другого варианта можно стащить у соседа :poop:, или написать самому :thumbsup:.

P.P.S. теперь можно удалить более не используемые импорты моделей JSON в _api/index.js_.

### Шаг :three: -- Обработка составных запросов. Фильтрация
Как вы могли заметить, на нашем клиенте имеется возможность ввести что-либо в стоку поиска, выбрать категорию или фильтр. Чтобы сообщить серверу о таких дополнительных параметрах, клиент в процессе GET-запроса может передавать параметры выполнения в URI ресурса после символа `?`. В нашем случае дополнительными параметрами строки запроса являются:
* `search` -- символы строки поиска
* `activeFilter` -- тип выбранного фильтра
* `activeCategory` -- тип выбранной категории

Каждый из параметров не обязательно может быть выбран/введен, в этом случае он не отправляется.

Для получения этих параметров запроса в Express.js используется объект *request* запроса функции обработчика `.get('/', (reqest, response) => ...)`, а именно его свойство .query.

>**Важно!** Не путать request.**query** и request.**params**:
>* params 
>
>       GET /api/books/1
>       app.get('/books/:id', (reqest, response)=>...)
>
>       request.params.id // 1
>
> * query
>
>       GET /api/books?search='Figth Club'
>       app.get('/books', (reqest, response)=>...)
>
>       request.query.search // Figth Club

Подробнее о _query_ [здесь](http://expressjs.com/ru/api.html#req.query), о _params_ [тут](http://expressjs.com/ru/api.html#req.params).

На примере, описанного ранее запроса для получения всех книг `GET /api/books`, добавим поддержку выборки с фильтрацией. В нашем случае запрос GET может содержать 3 параметра, т.е для того, чтобы на сервере проверить одно из возможных состояний фильтрации, нам необходимо написать 2^3 проверок (каждый фильтр может быть как в активном состоянии, так и не активен -- не отправляться).
Для исключения написания большого boilerplate на проверку всех условий, в проекте уже имеется функция-утилита, которая будет выполнять для каждой книги проверку на соответствие каждому из фильтров. Если фильтр не указан -- проверка опускается.

Эта утилита содержится в папке `./utils` в корне проекта, а именно в файле `meet-query.utils.js`.

Выполним импорт нашей функции в файле `./api/index.js`, и в обработчике нашего GET запроса, предварительно получив список всех книг, проверим каждую из них с помощью новой супер-утилиты :rocket::

```js
...
  const searchString = req.query.search;
  const activeFilter = req.query.activeFilter;
  const activeCategory = req.query.activeCategory;

  bookService
    .getAllBooks()
    .then(books => {
      const requiredBooks = books.filter(book =>
        meetQuery(book, searchString, activeFilter, activeCategory));

      return res.send(requiredBooks);
    })
    .catch(err => res.send(err));
...
```

>P.S. Данный способ обработки запроса не является оптимальным, поскольку каждый раз мы получать список всех книг. Подумайте, как можно было бы его оптимизировать?

Отлично, теперь мы можем фильтровать нашу коллекцию! Проверьте это в приложении.
Практическая часть закончена. Далее приведены самостоятельные задания, которые основаны на пройденном материале.

## Самостоятельные задания
Необходимо написать функцию обработчик POST-запроса `/api/book` в зависимости от параметра `action` (добавление, изменение или удаление книги).

>**Важно!** Дополнительные параметры в **POST**-запросе передаются в теле запроса (объект **request.body**). Подробнее про POST можно почитать [здесь](https://ru.wikipedia.org/wiki/POST_(HTTP)).

Для каждого задания указана **схема тела запроса** (объекта `body`), т.е то, что **нам отправляет в запросе клиент**.

Ответ клиенту подразумевает **изменный, в зависимости от *action*, список книг**, удовлетворяющий фильтрам, указанным в теле запроса.

>P.S. Параметр `_id`, который пердается с клиента, представляет собой шестнадцатеричный код, который MongoDB генерирует при создании объета автоматически. Для выбора необходимой книги по такому id необходимо будет импортировать функцию _.ObjectID_ из пакета `mongodb`, и использовать ее как обертку над принятым id, прим. `{"_id": ObjectID(_idFromBody)}`. Подробнее об [ObjectId](https://docs.mongodb.com/manual/reference/method/ObjectId/).

#### Задание №1. CREATE
Обработчик запроса на добавление книги (кнопка ADD A BOOK).
```js
// request.body schema
{
  action: 'create',
  book: {
    title: string,
    author: {
      firstName: string,
      lastName: string,
    },
    categories: string[],
    keywords: string[],
    img: string,
  }
  search: string | undefined,
  activeFilter: string | undefined,
  activeCategory: string | undefined,
}
```

#### Задание №2. UPDATE
Обработчик запроса на изменение рейтинга книги (клик на звезды под книгой).
```js
// request.body schema
{
  action: 'update',
  _id: string,
  rating: number
  search: string | undefined,
  activeFilter: string | undefined,
  activeCategory: string | undefined,
}
```

#### Задание №3. DELETE 
Обработчик запроса на удаление книги (клик на книгу, затем кнопка DELETE в модальном окне).
```js
// request.body schema
{
  action: 'delete',
  _id: string,
  search: string | undefined,
  activeFilter: string | undefined,
  activeCategory: string | undefined,
}
```

<p align="center">
  The End.
</p>

<p align="center">
  :tada:
</p>

