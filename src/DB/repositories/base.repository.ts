import type {
  QueryFilter,
  HydratedDocument,
  Model,
  ProjectionType,
  QueryOptions,
  Types,
  PopulateOptions,
  UpdateQuery,
} from "mongoose";

abstract class BaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  // Create ------------------------>
  async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
    return this.model.create(data);
  }

  // -----------------------------------------------
  // Find
  // -----------------------------------------------

  // Find By Id -------------------->
  async findById(
    id: Types.ObjectId | string,
  ): Promise<HydratedDocument<TDocument> | null> {
    return this.model.findById(id);
  }

  // Find One ---------------------->
  async findOne({
    filter,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model
      .findOne(filter)
      .populate(options?.populate as PopulateOptions | PopulateOptions[])
      .select(options?.select as ProjectionType<TDocument>)
      .sort(options?.sort)
      .exec();
  }

  // Find -------------------------->
  async find({
    filter,
    projection,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument>[] | []> {
    return this.model
      .find(filter, projection)
      .sort(options?.sort)
      .skip(options?.skip!)
      .limit(options?.limit!)
      .populate(options?.populate as PopulateOptions);
  }

  // -----------------------------------------------
  // Update
  // -----------------------------------------------

  // Find and update ---------------->
  async findByIdAndUpdate({
    id,
    update,
    options,
  }: {
    id: Types.ObjectId;
    update: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true, ...options });
  }

  async findOneAndUpdate({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    update: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      ...options,
    });
  }

  // -----------------------------------------------
  // Delete
  // -----------------------------------------------
  // Find and delete ---------------------->
  async findOneAndDelete({
    filter,
    options,
  }: {
    filter: QueryFilter<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model.findOneAndDelete(filter, options);
  }

  // -----------------------------------------------
  // Pagination
  // -----------------------------------------------
  async pagination<T>({
    page,
    limit,
    sort,
    populate,
    search,
  }: {
    page?: number;
    limit?: number;
    sort?: any;
    populate?: any;
    search?: QueryFilter<T>;
  }) {
    page = +page! || 1;
    limit = +limit! || 1;
    if (page < 1) page = 1;
    if (limit < 1) limit = 2;
    const skip = (page - 1) * limit;
    const [data, totalDoc] = await Promise.all([
      await this.model
        .find({ ...(search ?? {}) })
        .limit(limit)
        .skip(skip)
        .sort(sort)
        .populate(populate)
        .exec(),
      await this.model.countDocuments({ ...(search ?? {}) }),
    ]);
    const totalPages = Math.ceil(totalDoc / limit);
    return {
      meta: {
        currentPage: page,
        totalPages,
        limit,
        totalDoc,
      },
      data,
    };
  }
}

export default BaseRepository;