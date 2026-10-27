<x-mail::message>
# Срок тарифа скоро истекает

Клиника **{{ $clinicName }}**, тариф «{{ $tariffName }}» действует до **{{ $endsAt }}** (осталось {{ $daysLeft }} д.).

<x-mail::button :url="$paymentsUrl">
Продлить тариф
</x-mail::button>

С уважением,<br>
{{ config('app.name') }}
</x-mail::message>
