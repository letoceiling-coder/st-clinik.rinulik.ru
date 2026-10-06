<?php

namespace App\Http\Controllers\Admin;

use App\Models\City;
use App\Models\ClinicPropertyType;
use App\Models\CmsPage;
use App\Models\Concern;
use App\Models\District;
use App\Models\SeoTemplate;
use App\Models\Service;
use App\Models\Specialty;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Audit;
use App\Services\Seo;
use App\Support\Text;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Response;

/**
 * Универсальный CRUD для справочников, CMS-страниц и SEO-шаблонов.
 * Описание полей отдаётся на фронт и используется для генерации форм.
 */
class DictionaryController extends AdminController
{
    private const SLUG = 'nullable|string|max:120|regex:/^[a-z0-9\-]+$/';

    /** @return array<string,array<string,mixed>> */
    private function defs(): array
    {
        $specialtyOptions = fn () => Specialty::orderBy('name')->get(['id', 'name'])->map(fn ($s) => ['value' => $s->id, 'label' => $s->name])->all();

        return [
            'cities' => [
                'title' => 'Города', 'perm' => 'admin.dictionaries', 'model' => City::class, 'search' => ['name', 'region'],
                'columns' => ['name', 'region', 'population', 'is_active'], 'order' => ['sort', 'asc'],
                'fields' => [
                    ['name' => 'name', 'label' => 'Название', 'type' => 'text', 'required' => true],
                    ['name' => 'name_in', 'label' => 'Предложный падеж («в Москве»)', 'type' => 'text'],
                    ['name' => 'slug', 'label' => 'Slug (URL)', 'type' => 'text', 'help' => 'Латиницей; если пусто — сформируется автоматически.'],
                    ['name' => 'region', 'label' => 'Регион', 'type' => 'text'],
                    ['name' => 'population', 'label' => 'Население', 'type' => 'number'],
                    ['name' => 'sort', 'label' => 'Порядок', 'type' => 'number'],
                    ['name' => 'is_active', 'label' => 'Показывать', 'type' => 'checkbox'],
                ],
                'rules' => ['name' => 'required|string|max:120', 'name_in' => 'nullable|string|max:120', 'slug' => self::SLUG, 'region' => 'nullable|string|max:120', 'population' => 'nullable|integer|min:0', 'sort' => 'nullable|integer|min:0|max:9999', 'is_active' => 'boolean'],
                'in_use' => fn (City $c) => $c->clinics()->exists() ? 'В городе есть клиники — сначала перенесите или удалите их.' : null,
            ],
            'districts' => [
                'title' => 'Районы', 'perm' => 'admin.dictionaries', 'model' => District::class, 'search' => ['name'],
                'columns' => ['name', 'city_id'], 'order' => ['id', 'desc'],
                'fields' => [
                    ['name' => 'city_id', 'label' => 'Город', 'type' => 'select', 'required' => true, 'options' => City::orderBy('name')->get(['id', 'name'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->name])->all()],
                    ['name' => 'name', 'label' => 'Название', 'type' => 'text', 'required' => true],
                    ['name' => 'slug', 'label' => 'Slug (URL)', 'type' => 'text'],
                ],
                'rules' => ['city_id' => 'required|exists:cities,id', 'name' => 'required|string|max:120', 'slug' => self::SLUG],
            ],
            'specialties' => [
                'title' => 'Направления', 'perm' => 'admin.dictionaries', 'model' => Specialty::class, 'search' => ['name'],
                'columns' => ['name', 'short', 'is_active'], 'order' => ['sort', 'asc'],
                'fields' => [
                    ['name' => 'name', 'label' => 'Название', 'type' => 'text', 'required' => true],
                    ['name' => 'slug', 'label' => 'Slug (URL)', 'type' => 'text'],
                    ['name' => 'icon', 'label' => 'Иконка', 'type' => 'text', 'help' => 'Ключ иконки интерфейса, например tooth, implant, braces.'],
                    ['name' => 'short', 'label' => 'Короткое описание', 'type' => 'text'],
                    ['name' => 'description', 'label' => 'Описание', 'type' => 'textarea'],
                    ['name' => 'when_to_apply', 'label' => 'Когда обращаются', 'type' => 'textarea'],
                    ['name' => 'restrictions', 'label' => 'Ограничения приёма', 'type' => 'textarea'],
                    ['name' => 'sort', 'label' => 'Порядок', 'type' => 'number'],
                    ['name' => 'is_active', 'label' => 'Показывать', 'type' => 'checkbox'],
                ],
                'rules' => ['name' => 'required|string|max:120', 'slug' => self::SLUG, 'icon' => 'nullable|string|max:40', 'short' => 'nullable|string|max:200', 'description' => 'nullable|string|max:3000', 'when_to_apply' => 'nullable|string|max:3000', 'restrictions' => 'nullable|string|max:3000', 'sort' => 'nullable|integer|min:0|max:9999', 'is_active' => 'boolean'],
                'in_use' => fn (Specialty $s) => ($s->services()->exists() || $s->doctors()->exists() || $s->clinics()->exists()) ? 'Направление используется (услуги, врачи или клиники). Скройте его вместо удаления.' : null,
            ],
            'services' => [
                'title' => 'Услуги', 'perm' => 'admin.dictionaries', 'model' => Service::class, 'search' => ['name'],
                'columns' => ['name', 'specialty_id', 'price_hint_from', 'is_popular', 'is_active'], 'order' => ['id', 'desc'],
                'fields' => [
                    ['name' => 'specialty_id', 'label' => 'Направление', 'type' => 'select', 'required' => true, 'options' => $specialtyOptions()],
                    ['name' => 'name', 'label' => 'Название', 'type' => 'text', 'required' => true],
                    ['name' => 'slug', 'label' => 'Slug (URL)', 'type' => 'text'],
                    ['name' => 'description', 'label' => 'Описание', 'type' => 'textarea'],
                    ['name' => 'price_hint_from', 'label' => 'Ориентир цены «от», ₽', 'type' => 'number'],
                    ['name' => 'duration_min', 'label' => 'Длительность, мин', 'type' => 'number'],
                    ['name' => 'is_popular', 'label' => 'Популярная', 'type' => 'checkbox'],
                    ['name' => 'is_active', 'label' => 'Показывать', 'type' => 'checkbox'],
                ],
                'rules' => ['specialty_id' => 'required|exists:specialties,id', 'name' => 'required|string|max:160', 'slug' => self::SLUG, 'description' => 'nullable|string|max:2000', 'price_hint_from' => 'nullable|integer|min:0', 'duration_min' => 'nullable|integer|min:0|max:1000', 'is_popular' => 'boolean', 'is_active' => 'boolean'],
                'in_use' => fn (Service $s) => $s->clinicServices()->exists() ? 'Услуга есть в прайсах клиник. Скройте её вместо удаления.' : null,
            ],
            'clinic_property_types' => [
                'title' => 'Свойства клиник', 'perm' => 'admin.dictionaries', 'model' => ClinicPropertyType::class, 'search' => ['name', 'slug', 'group'],
                'columns' => ['name', 'slug', 'group', 'filter_kind', 'is_active', 'show_in_filter', 'show_in_cabinet'], 'order' => ['sort', 'asc'],
                'fields' => [
                    ['name' => 'name', 'label' => 'Название', 'type' => 'text', 'required' => true],
                    ['name' => 'slug', 'label' => 'Slug (параметр URL)', 'type' => 'text', 'help' => 'Латиницей; если пусто — сформируется из названия.'],
                    ['name' => 'group', 'label' => 'Группа в фильтре', 'type' => 'text', 'help' => 'Например: Оплата, Оборудование, Возможности.'],
                    ['name' => 'filter_kind', 'label' => 'Тип фильтра', 'type' => 'select', 'required' => true, 'options' => [
                        ['value' => 'boolean', 'label' => 'Флаг клиники (boolean)'],
                        ['value' => 'specialty', 'label' => 'Направление (specialty slug)'],
                        ['value' => 'sort', 'label' => 'Сортировка'],
                        ['value' => 'achievement', 'label' => 'Есть достижения'],
                    ]],
                    ['name' => 'db_column', 'label' => 'Колонка в clinics', 'type' => 'select', 'options' => collect(ClinicPropertyType::DB_COLUMNS)->map(fn ($c) => ['value' => $c, 'label' => $c])->all()],
                    ['name' => 'filter_value', 'label' => 'Значение фильтра', 'type' => 'text', 'help' => 'Slug направления или ключ сортировки (price_asc).'],
                    ['name' => 'sort', 'label' => 'Порядок', 'type' => 'number'],
                    ['name' => 'is_active', 'label' => 'Активно', 'type' => 'checkbox'],
                    ['name' => 'show_in_filter', 'label' => 'Показывать в фильтре каталога', 'type' => 'checkbox'],
                    ['name' => 'show_in_cabinet', 'label' => 'Показывать в ЛК клиники', 'type' => 'checkbox'],
                ],
                'rules' => [
                    'name' => 'required|string|max:120',
                    'slug' => self::SLUG,
                    'group' => 'nullable|string|max:60',
                    'filter_kind' => 'required|in:'.implode(',', ClinicPropertyType::KINDS),
                    'db_column' => 'nullable|string|in:'.implode(',', ClinicPropertyType::DB_COLUMNS),
                    'filter_value' => 'nullable|string|max:60',
                    'sort' => 'nullable|integer|min:0|max:9999',
                    'is_active' => 'boolean',
                    'show_in_filter' => 'boolean',
                    'show_in_cabinet' => 'boolean',
                ],
            ],
            'concerns' => [
                'title' => 'Что беспокоит', 'perm' => 'admin.dictionaries', 'model' => Concern::class, 'search' => ['name', 'keywords'],
                'columns' => ['name', 'specialty_id', 'is_active'], 'order' => ['sort', 'asc'],
                'fields' => [
                    ['name' => 'name', 'label' => 'Формулировка', 'type' => 'text', 'required' => true],
                    ['name' => 'slug', 'label' => 'Slug (URL)', 'type' => 'text'],
                    ['name' => 'specialty_id', 'label' => 'Направление', 'type' => 'select', 'options' => $specialtyOptions()],
                    ['name' => 'icon', 'label' => 'Иконка', 'type' => 'text'],
                    ['name' => 'hint', 'label' => 'Подсказка', 'type' => 'text'],
                    ['name' => 'advice', 'label' => 'Что делать (общая информация, без диагнозов)', 'type' => 'textarea'],
                    ['name' => 'keywords', 'label' => 'Ключевые слова для поиска', 'type' => 'text'],
                    ['name' => 'service_ids', 'label' => 'Связанные услуги', 'type' => 'multiselect', 'options' => Service::orderBy('name')->get(['id', 'name'])->map(fn ($s) => ['value' => $s->id, 'label' => $s->name])->all()],
                    ['name' => 'sort', 'label' => 'Порядок', 'type' => 'number'],
                    ['name' => 'is_active', 'label' => 'Показывать', 'type' => 'checkbox'],
                ],
                'rules' => ['name' => 'required|string|max:160', 'slug' => self::SLUG, 'specialty_id' => 'nullable|exists:specialties,id', 'icon' => 'nullable|string|max:40', 'hint' => 'nullable|string|max:200', 'advice' => 'nullable|string|max:2000', 'keywords' => 'nullable|string|max:255', 'service_ids' => 'nullable|array', 'service_ids.*' => 'exists:services,id', 'sort' => 'nullable|integer|min:0|max:9999', 'is_active' => 'boolean'],
                'sync' => ['service_ids' => 'services'],
            ],
            'pages' => [
                'title' => 'CMS-страницы', 'perm' => 'admin.cms', 'model' => CmsPage::class, 'search' => ['title', 'slug'],
                'columns' => ['title', 'slug', 'kind', 'status'], 'order' => ['id', 'asc'],
                'fields' => [
                    ['name' => 'title', 'label' => 'Заголовок', 'type' => 'text', 'required' => true],
                    ['name' => 'slug', 'label' => 'Slug (URL)', 'type' => 'text', 'required' => true],
                    ['name' => 'kind', 'label' => 'Тип', 'type' => 'select', 'options' => [['value' => 'page', 'label' => 'Страница'], ['value' => 'legal', 'label' => 'Юридический документ']]],
                    ['name' => 'body', 'label' => 'Текст (Markdown)', 'type' => 'textarea', 'rows' => 12],
                    ['name' => 'meta_title', 'label' => 'Meta title', 'type' => 'text'],
                    ['name' => 'meta_description', 'label' => 'Meta description', 'type' => 'textarea'],
                    ['name' => 'status', 'label' => 'Статус', 'type' => 'select', 'options' => [['value' => 'published', 'label' => 'Опубликована'], ['value' => 'draft', 'label' => 'Черновик']]],
                ],
                'rules' => ['title' => 'required|string|max:200', 'slug' => 'required|string|max:120|regex:/^[a-z0-9\-]+$/', 'kind' => 'required|in:page,legal', 'body' => 'nullable|string|max:60000', 'meta_title' => 'nullable|string|max:200', 'meta_description' => 'nullable|string|max:400', 'status' => 'required|in:published,draft'],            ],
            'seo' => [
                'title' => 'SEO-шаблоны', 'perm' => 'admin.seo', 'model' => SeoTemplate::class, 'search' => ['page_type', 'title_tpl'],
                'columns' => ['page_type', 'title_tpl', 'noindex'], 'order' => ['id', 'asc'],
                'fields' => [
                    ['name' => 'page_type', 'label' => 'Тип страницы', 'type' => 'text', 'required' => true, 'help' => 'Например: city_clinics, clinic, doctor, direction.'],
                    ['name' => 'title_tpl', 'label' => 'Title', 'type' => 'text', 'required' => true, 'help' => 'Переменные: {city}, {city_in}, {name}, {specialty}, {count}, {min_price}, {rating}.'],
                    ['name' => 'description_tpl', 'label' => 'Description', 'type' => 'textarea', 'required' => true],
                    ['name' => 'h1_tpl', 'label' => 'H1', 'type' => 'text'],
                    ['name' => 'noindex', 'label' => 'Закрыть от индексации', 'type' => 'checkbox'],
                ],
                'rules' => ['page_type' => 'required|string|max:32', 'title_tpl' => 'required|string|max:255', 'description_tpl' => 'required|string|max:400', 'h1_tpl' => 'nullable|string|max:255', 'noindex' => 'boolean'],
            ],
        ];
    }

    /** @return array<string,mixed> */
    private function def(Request $request, string $resource): array
    {
        $def = $this->defs()[$resource] ?? abort(404);
        abort_unless($request->user()->hasPermission($def['perm']), 403);

        return $def;
    }

    public function index(Request $request, string $resource): Response
    {
        $def = $this->def($request, $resource);
        $q = trim((string) $request->query('q'));
        $model = $def['model'];

        $page = $model::query()
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => collect($def['search'])->each(fn ($col) => $w->orWhere($col, 'like', "%$q%"))))
            ->orderBy(...$def['order'])->paginate(25)->withQueryString();

        $names = collect($def['fields'])->pluck('name')->all();
        $syncs = $def['sync'] ?? [];

        $rows = $page->through(function (Model $m) use ($names, $syncs) {
            $row = ['id' => $m->getKey()];
            foreach ($names as $n) {
                $row[$n] = isset($syncs[$n]) ? $m->{$syncs[$n]}()->pluck('id')->values() : $m->getAttribute($n);
            }

            return $row;
        })->toArray();

        $lookups = collect($def['fields'])->filter(fn ($f) => ($f['type'] ?? '') === 'select' && isset($f['options']))
            ->mapWithKeys(fn ($f) => [$f['name'] => collect($f['options'])->pluck('label', 'value')]);

        return $this->render('Admin/Dictionary', $def['title'], [
            'resource' => $resource,
            'title' => $def['title'],
            'columns' => collect($def['columns'])->map(function ($c) use ($def) {
                $f = collect($def['fields'])->firstWhere('name', $c);

                return ['name' => $c, 'label' => $f['label'] ?? $c, 'type' => $f['type'] ?? 'text'];
            })->values(),
            'fields' => $def['fields'],
            'lookups' => $lookups,
            'rows' => $rows,
            'tabs' => collect($this->defs())->filter(fn ($d) => $request->user()->hasPermission($d['perm']))->map(fn ($d, $k) => ['key' => $k, 'title' => $d['title']])->values(),
            'filters' => array_filter(['q' => $q]),
        ]);
    }

    public function store(Request $request, string $resource): RedirectResponse
    {
        $def = $this->def($request, $resource);
        $model = new $def['model'];

        return $this->save($request, $def, $model, 'Запись добавлена.');
    }

    public function update(Request $request, string $resource, int $id): RedirectResponse
    {
        $def = $this->def($request, $resource);
        $model = $def['model']::findOrFail($id);

        return $this->save($request, $def, $model, 'Изменения сохранены.');
    }

    public function destroy(Request $request, string $resource, int $id): RedirectResponse
    {
        $def = $this->def($request, $resource);
        $model = $def['model']::findOrFail($id);

        if (isset($def['in_use']) && ($reason = $def['in_use']($model))) {
            return back()->with('error', $reason);
        }

        Audit::log("dictionary.$resource.deleted", $model);
        $model->delete();
        $this->flush();

        return back()->with('success', 'Запись удалена.');
    }

    /** @param array<string,mixed> $def */
    private function save(Request $request, array $def, Model $model, string $message): RedirectResponse
    {
        $data = Validator::make($request->all(), $def['rules'], [
            'required' => 'Заполните поле.', 'regex' => 'Допустимы латиница, цифры и дефис.', 'exists' => 'Выберите значение из списка.',
        ])->validate();

        $syncs = $def['sync'] ?? [];
        $sync = [];
        foreach ($syncs as $field => $relation) {
            $sync[$relation] = $data[$field] ?? [];
            unset($data[$field]);
        }

        if (array_key_exists('slug', $def['rules']) && blank($data['slug'] ?? null) && ! empty($data['name'] ?? $data['title'] ?? null)) {
            $data['slug'] = Text::slug($data['name'] ?? $data['title']);
        }
        if (isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($def['model'], $data['slug'], $model->getKey(), $data['city_id'] ?? null);
        }

        $model->fill($data)->save();
        foreach ($sync as $relation => $ids) {
            $model->{$relation}()->sync($ids);
        }

        Audit::log('dictionary.'.class_basename($model).'.saved', $model);
        $this->flush();

        return back()->with('success', $message);
    }

    private function uniqueSlug(string $model, string $slug, mixed $ignoreId, mixed $cityId): string
    {
        $base = $slug;
        $i = 2;
        while ($model::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->when($cityId && $model === District::class, fn ($q) => $q->where('city_id', $cityId))
            ->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    private function flush(): void
    {
        ClinicPropertyType::flushCache();
        app(CatalogRepository::class)->flush();
        Seo::flush();
    }
}
