<?php
if (!function_exists('hari')) {
    function hari(string $date): string {
        return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][date('w', strtotime($date))];
    }
}
