export function currentYear() {
    const date = new Date();
    return date.getFullYear() - (date.getMonth() < 6 ? 1 : 0);
}
export const classLabel = room => room.name + ' (' + room.start_year + '/' + (Number(room.start_year)+1) + ')';
