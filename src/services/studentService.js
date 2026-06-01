import mockData from '../mock/students.json'

let students = mockData.map(s => ({ ...s }))

export const studentService = {
  async getAll() {
    return students.map(s => ({ ...s }))
  },

  async getByDay(weekday) {
    return students.filter(s => s.scheduleDays.includes(weekday)).map(s => ({ ...s }))
  },

  async create(data) {
    const student = { ...data, id: 's' + Date.now() }
    students.push(student)
    return { ...student }
  },

  async update(id, data) {
    const idx = students.findIndex(s => s.id === id)
    if (idx === -1) throw new Error('學生不存在')
    students[idx] = { ...students[idx], ...data }
    return { ...students[idx] }
  },

  async remove(id) {
    students = students.filter(s => s.id !== id)
  }
}
