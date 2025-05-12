import BookCard from './BookCard'
import { Book } from '@/types/book'

type BookGridProps = {
  books: Book[];
}

export default function BookGrid({ books }: BookGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map(book => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
