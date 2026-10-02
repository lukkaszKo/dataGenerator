# Generator mocków REST

Definiujesz zmienne (imię, nazwisko, data, numer, słownik, boolean), wstawiasz je do szablonu JSON jako `{{nazwa}}` i generujesz losowe dane testowe.

## Uruchomienie

Wymagany Node.js. Aplikacja działa przez mały lokalny serwer, który też zapisuje widoki w folderze `saved/`:

```
npm start     # http://localhost:3000  (inny port: PORT=4000 npm start)
npm test
```

## Moje widoki

Panel po lewej zapisuje zmienne, szablon i liczbę rekordów jako plik `saved/<folder>/<nazwa>.json` (lub bezpośrednio w `saved/`). Foldery dodajesz przyciskiem „Dodaj folder” (jeden poziom). Menu „⋯” przy widoku: Wczytaj, Zaktualizuj, Usuń (usunięcie można cofnąć). Pasek „Bieżący widok” pokazuje, czy są niezapisane zmiany; przy wczytywaniu innego widoku, zaczynaniu od zera i zamykaniu karty aplikacja ostrzega przed ich utratą. **Ctrl+S** aktualizuje bieżący widok (lub otwiera pole z nazwą nowego). Pliki możesz commitować do gita albo kopiować między komputerami. Serwer nasłuchuje tylko na `127.0.0.1`.

## Historia

Panel po prawej pokazuje wyniki z „Generuj”: godzinę, liczbę rekordów, widok źródłowy i początek JSON-a, pogrupowane po dniach. Każdy wynik to plik `history/<RRRR-MM-DD_gg-mm-ss-mmm>.json` razem z szablonem i zmiennymi, z których powstał. Menu „⋯” przy wpisie: Pokaż wynik, Kopiuj, Przywróć szablon i zmienne, Przypnij/Odepnij, Usuń (można cofnąć). Zostaje 200 ostatnich nieprzypiętych wpisów, starsze serwer kasuje przy zapisie; przypięte (`*.pin.json`) nigdy. „Wyczyść” kasuje tylko nieprzypięte. Wczytanie zapisanego widoku nie dodaje wpisu do historii.

## Inne

- Przełącznik motywu (auto / jasny / ciemny) w nagłówku, zapamiętywany w przeglądarce.
- Na wąskich ekranach (< 980 px) boczne panele są domyślnie zwinięte.
- „Pobierz” zapisuje wynik jako plik `.json`.
- Zmienna **ZDJĘCIE** (grupa Osoba) wstawia losowe zdjęcie twarzy jako base64 lub data URI. Zdjęcia pobiera serwer z `https://thispersondoesnotexist.com/random-person.jpeg` (przeglądarka nie może — CORS), więc potrzebny jest internet. Każde ma ok. 0,5 MB, dlatego jedno generowanie obejmuje maks. 100 zdjęć (rekordy × zmienne ZDJĘCIE), a w historii długie wartości są skracane. Wczytanie widoku nie pobiera zdjęć — kliknij „Generuj”.

## Struktura

```
index.html            markup
server.js             serwer lokalny: pliki aplikacji + API zapisu widoków
saved/                zapisane widoki (foldery i pliki .json)
history/              historia generowania (pliki .json)
css/styles.css        style
js/main.js            start aplikacji
js/state.js           stan + localStorage
js/dom.js             skróty do DOM
js/data/              dane słownikowe (imiona, nazwiska)
js/generators/        generatory wartości (bez DOM); rejestr typów w index.js
js/template/          parsowanie szablonu i podstawianie zmiennych (bez DOM)
js/ui/                formularze, lista zmiennych, edytor, wynik, widoki, historia, dialog, menu, motyw
tests/                testy logiki i serwera (npm test)
```

Nowy typ zmiennej: dodaj generator w `js/generators/`, wpis w `TYPES` (`generators/index.js`), formularz w `index.html` i obsługę w `js/ui/modal.js`.
